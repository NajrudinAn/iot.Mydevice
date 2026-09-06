const express = require('express');
const router = express.Router();
const Application = require('../models/application');
const ApplicationFrontend = require('../models/applicationFrontend');
const path = require('path');
const fs = require('fs');

const UPLOADS_BASE_DIR = path.resolve(__dirname, '../../uploads/applications');

router.get('/:slug*', async (req, res) => {
    try {
        const { slug } = req.params;
        const app = await Application.findBySlug(slug);
        if (!app) {
            return res.status(404).send('Application not found');
        }

        // Check for active deployment
        const { pool } = require('../config/db');
        const activeDeployRes = await pool.query(
            "SELECT id FROM application_deployments WHERE application_id = $1 AND status = 'ACTIVE'",
            [app.id]
        );
        
        let appDir;
        if (activeDeployRes.rows.length > 0) {
            const activeDeployId = activeDeployRes.rows[0].id;
            appDir = path.join(UPLOADS_BASE_DIR, app.workspace_id, app.id, 'deployments', activeDeployId);
        } else {
            // Fallback to legacy appDir for migration compatibility or no deployment
            appDir = path.join(UPLOADS_BASE_DIR, app.workspace_id, app.id);
        }

        // Always resolve the base href for this app for the base tag injection
        const baseHref = `/hosted/${slug}/`;

        const rawPath = req.params[0] || '';
        const relativePath = rawPath.replace(/^\//, '');
        const targetFile = relativePath === '' ? 'index.html' : relativePath;
        const absolutePath = path.join(appDir, targetFile);


        // Prevent path traversal manually as an extra safety measure
        if (!absolutePath.startsWith(appDir)) {
            return res.status(403).send('Forbidden');
        }

        // If physical file exists, serve it
        if (fs.existsSync(absolutePath) && fs.lstatSync(absolutePath).isFile()) {
            if (targetFile === 'index.html' || targetFile === 'index.htm') {
                let html = fs.readFileSync(absolutePath, 'utf8');
                const injection = `
    <base href="${baseHref}">
    <script>
        window.PLATFORM_APP_ID = '${app.id}';
        window.PLATFORM_APP_SLUG = '${app.slug}';
        window.PLATFORM_WORKSPACE_ID = '${app.workspace_id}';
        window.PLATFORM_BASE_URL = window.location.origin;
    </script>
`;
                html = html.replace('<head>', `<head>${injection}`);
                return res.send(html);
            }

            return res.sendFile(targetFile, { root: appDir }, (err) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        fallbackLegacy(app, res);
                    } else {
                        res.status(err.status || 500).end();
                    }
                }
            });
        }

        // Fallback to legacy database rendering
        await fallbackLegacy(app, res);

    } catch (error) {
        console.error('Error in hostedApp router:', error);
        res.status(500).send('Server Error');
    }
});

async function fallbackLegacy(app, res) {
    try {
        const frontend = await ApplicationFrontend.getByApplicationId(app.id);
        
        if (!frontend) {
            return res.status(404).send('<h1>Application Frontend Not Configured</h1><p>The admin has not deployed a custom frontend yet.</p>');
        }

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${app.display_name || app.name}</title>
    ${app.favicon_url ? `<link rel="icon" href="${app.favicon_url}">` : ''}
    <style>
        ${frontend.css_content || ''}
    </style>
</head>
<body>
    ${frontend.html_content || '<h1>Application Frontend Not Configured</h1><p>The admin has not deployed a custom frontend yet.</p>'}
    
    <script>
        // Inject application context for the custom JS to use
        window.MYDEVICE_APP_ID = "${app.id}";
        window.MYDEVICE_APP_SLUG = "${app.slug}";
        window.MYDEVICE_API_URL = "/api";
        
        ${frontend.js_content || ''}
    </script>
</body>
</html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch(err) {
        console.error('Error in fallbackLegacy:', err);
        return res.status(404).send('<h1>Application Frontend Not Configured</h1><p>The admin has not deployed a custom frontend yet.</p>');
    }
}

module.exports = router;
