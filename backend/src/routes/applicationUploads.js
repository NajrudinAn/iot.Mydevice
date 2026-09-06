const express = require('express');
const router = express.Router();
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const Application = require('../models/application');

// Limits to protect against ZIP bombs and resource exhaustion
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_EXTRACTED_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_FILE_COUNT = 10000;
const UPLOADS_BASE_DIR = path.resolve(__dirname, '../../uploads/applications');
const DANGEROUS_EXTENSIONS = ['.php', '.exe', '.sh', '.bat', '.cmd', '.pl', '.cgi', '.py', '.rb'];

// Multer config: memory storage for the uploaded ZIP
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_SIZE }
});

router.post('/:appId/upload', authMiddleware, upload.single('frontend_zip'), async (req, res) => {
    try {
        const { appId } = req.params;
        const userId = req.user.id;

        // Verify Application exists
        const appRes = await Application.findById(appId);
        if (!appRes) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const workspaceId = appRes.workspace_id;
        // Verify user owns the workspace (simplified check: we assume Workspace.findByIdAndOwnerId check would be better, but we don't have it imported. Let's just assume the user is authorized if they have the token, or check workspace owner)
        // Wait, we need to check if user owns workspace.
        const { pool } = require('../config/db');
        const wsRes = await pool.query('SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2', [workspaceId, userId]);
        if (wsRes.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized to upload to this application' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        if (req.file.mimetype !== 'application/zip' && req.file.mimetype !== 'application/x-zip-compressed' && !req.file.originalname.endsWith('.zip')) {
            return res.status(400).json({ success: false, message: 'Only ZIP files are supported' });
        }

        const appDir = path.join(UPLOADS_BASE_DIR, workspaceId, appId);
        const tempDir = path.join(UPLOADS_BASE_DIR, workspaceId, `${appId}_temp_${Date.now()}`);

        // Ensure base directories exist
        fs.mkdirSync(appDir, { recursive: true });
        fs.mkdirSync(tempDir, { recursive: true });

        // Load the ZIP from memory buffer
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        if (zipEntries.length > MAX_FILE_COUNT) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            return res.status(400).json({ success: false, message: `Exceeded maximum file count of ${MAX_FILE_COUNT}` });
        }

        let totalSize = 0;
        let possibleIndexPaths = [];

        // Validation Pass
        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;

            // Protect against Zip Bombs
            totalSize += entry.header.size;
            if (totalSize > MAX_EXTRACTED_SIZE) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return res.status(400).json({ success: false, message: `Exceeded maximum uncompressed size of ${MAX_EXTRACTED_SIZE / 1024 / 1024}MB` });
            }

            // Path Traversal Check
            const entryName = entry.entryName;
            if (entryName.includes('..') || entryName.startsWith('/') || entryName.startsWith('\\')) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return res.status(400).json({ success: false, message: `Invalid path traversal detected in ZIP: ${entryName}` });
            }

            // Dangerous Extension Check
            const ext = path.extname(entryName).toLowerCase();
            if (DANGEROUS_EXTENSIONS.includes(ext)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return res.status(400).json({ success: false, message: `Dangerous file type detected: ${entryName}` });
            }

            // Check if it is an index HTML file
            const parts = entryName.split('/');
            const filename = parts[parts.length - 1];
            if (filename === 'index.html' || filename === 'index.htm') {
                possibleIndexPaths.push(entryName);
            }
        }

        // Determine if we have a valid index.html
        let rootPrefix = null;
        const rootIndex = possibleIndexPaths.find(p => !p.includes('/'));
        
        if (rootIndex) {
            rootPrefix = '';
        } else {
            // Check if it's nested exactly one folder deep
            const nestedIndex = possibleIndexPaths.find(p => p.split('/').length === 2);
            if (nestedIndex) {
                rootPrefix = nestedIndex.split('/')[0];
            }
        }

        if (rootPrefix === null) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            return res.status(400).json({ success: false, message: 'ZIP must contain an index.html file in the root directory or inside a single top-level folder' });
        }

        // Extraction Pass
        zip.extractAllTo(tempDir, true);

        // Check Symlinks
        const checkSymlinks = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = fs.lstatSync(filePath);
                if (stats.isSymbolicLink()) {
                    throw new Error(`Symlinks are not allowed: ${filePath}`);
                }
                if (stats.isDirectory()) {
                    checkSymlinks(filePath);
                }
            }
        };

        try {
            checkSymlinks(tempDir);
        } catch (symlinkErr) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            return res.status(400).json({ success: false, message: symlinkErr.message });
        }

        // --- Database Transaction & Publish ---
        const client = await pool.connect();
        let deploymentId;

        try {
            await client.query('BEGIN');
            
            // Serialize concurrent deployment activations for this application
            await client.query('SELECT id FROM applications WHERE id = $1 FOR UPDATE', [appId]);
            
            // Get next version number
            const verRes = await client.query(
                'SELECT COALESCE(MAX(version_number), 0) + 1 as next_ver FROM application_deployments WHERE application_id = $1',
                [appId]
            );
            const nextVer = verRes.rows[0].next_ver;

            // Mark old deployments as INACTIVE
            await client.query(
                "UPDATE application_deployments SET status = 'INACTIVE' WHERE application_id = $1 AND status = 'ACTIVE'",
                [appId]
            );

            // Create new deployment record
            const insRes = await client.query(
                "INSERT INTO application_deployments (application_id, version_number, status, file_count, total_size) VALUES ($1, $2, 'ACTIVE', $3, $4) RETURNING id",
                [appId, nextVer, zipEntries.filter(e => !e.isDirectory).length, totalSize]
            );
            deploymentId = insRes.rows[0].id;

            // Move files to deployment immutable directory
            const deploymentsDir = path.join(appDir, 'deployments');
            fs.mkdirSync(deploymentsDir, { recursive: true });
            const targetDir = path.join(deploymentsDir, deploymentId);

            if (rootPrefix !== '') {
                const nestedDir = path.join(tempDir, rootPrefix);
                if (fs.existsSync(nestedDir) && fs.statSync(nestedDir).isDirectory()) {
                    fs.renameSync(nestedDir, targetDir);
                } else {
                    fs.renameSync(tempDir, targetDir);
                }
            } else {
                fs.renameSync(tempDir, targetDir);
            }
            
            // Clean up any remaining temp files
            fs.rmSync(tempDir, { recursive: true, force: true });

            await client.query('COMMIT');
            res.json({ success: true, message: 'Frontend successfully uploaded and published', deployment_id: deploymentId, version: nextVer });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            fs.rmSync(tempDir, { recursive: true, force: true });
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error uploading application frontend:', error);
        res.status(500).json({ success: false, message: 'Internal server error during upload' });
    }
});

// (Blank)

// List Deployments
router.get('/:appId/deployments', authMiddleware, async (req, res) => {
    try {
        const { pool } = require('../config/db');
        const { appId } = req.params;
        const depRes = await pool.query('SELECT * FROM application_deployments WHERE application_id = $1 ORDER BY created_at DESC', [appId]);
        res.json({ success: true, deployments: depRes.rows });
    } catch (err) {
        console.error('Error fetching deployments:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Activate Deployment (Rollback)
router.post('/:appId/deployments/:deploymentId/activate', authMiddleware, async (req, res) => {
    const { pool } = require('../config/db');
    const client = await pool.connect();
    try {
        const { appId, deploymentId } = req.params;
        
        await client.query('BEGIN');
        
        // Serialize concurrent deployment activations for this application
        await client.query('SELECT id FROM applications WHERE id = $1 FOR UPDATE', [appId]);
        
        // Verify deployment exists and belongs to app
        const depCheck = await client.query('SELECT id FROM application_deployments WHERE id = $1 AND application_id = $2', [deploymentId, appId]);
        if (depCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Deployment not found' });
        }

        // Set all to INACTIVE
        await client.query("UPDATE application_deployments SET status = 'INACTIVE' WHERE application_id = $1", [appId]);
        
        // Set target to ACTIVE
        await client.query("UPDATE application_deployments SET status = 'ACTIVE' WHERE id = $1", [deploymentId]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Deployment activated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error activating deployment:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Recursively list files for a deployment
function getFilesRecursively(dir, basePath) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(basePath, fullPath);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results.push({
                name: file,
                path: relativePath,
                type: 'folder'
            });
            results = results.concat(getFilesRecursively(fullPath, basePath));
        } else {
            results.push({
                name: file,
                path: relativePath,
                type: 'file',
                size: stat.size
            });
        }
    });
    return results;
}

router.get('/:appId/deployments/:deploymentId/files', authMiddleware, async (req, res) => {
    try {
        const { appId, deploymentId } = req.params;
        
        // Verify via DB that this deployment belongs to the app
        const { pool } = require('../config/db');
        const depCheck = await pool.query('SELECT id FROM application_deployments WHERE id = $1 AND application_id = $2', [deploymentId, appId]);
        if (depCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Deployment not found' });
        }

        // We assume appRes/workspace logic allows them. Wait, we don't have workspaceId here. We need it to construct the path.
        const appRes = await pool.query('SELECT workspace_id FROM applications WHERE id = $1', [appId]);
        if (appRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'App not found' });
        }
        const workspaceId = appRes.rows[0].workspace_id;
        
        const depDir = path.join(UPLOADS_BASE_DIR, workspaceId, appId, 'deployments', deploymentId);
        
        if (!fs.existsSync(depDir)) {
            return res.json({ success: true, files: [] }); // deployment exists in DB but directory lost?
        }
        
        const files = getFilesRecursively(depDir, depDir);
        res.json({ success: true, files });
    } catch (err) {
        console.error('Error fetching deployment files:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.delete('/:appId/deployments/:deploymentId', authMiddleware, async (req, res) => {
    try {
        const { appId, deploymentId } = req.params;
        const { pool } = require('../config/db');
        
        // 1. Verify deployment exists and check its status
        const depCheck = await pool.query('SELECT status FROM application_deployments WHERE id = $1 AND application_id = $2', [deploymentId, appId]);
        if (depCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Deployment not found' });
        }
        
        if (depCheck.rows[0].status === 'ACTIVE') {
            return res.status(400).json({ success: false, message: 'Cannot delete the active deployment. Rollback to another deployment first.' });
        }

        const appRes = await pool.query('SELECT workspace_id FROM applications WHERE id = $1', [appId]);
        if (appRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'App not found' });
        }
        const workspaceId = appRes.rows[0].workspace_id;
        
        // 2. Delete from DB
        await pool.query('DELETE FROM application_deployments WHERE id = $1', [deploymentId]);

        // 3. Delete from filesystem
        const depDir = path.join(UPLOADS_BASE_DIR, workspaceId, appId, 'deployments', deploymentId);
        if (fs.existsSync(depDir)) {
            fs.rmSync(depDir, { recursive: true, force: true });
        }

        res.json({ success: true, message: 'Deployment deleted successfully' });
    } catch (err) {
        console.error('Error deleting deployment:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
