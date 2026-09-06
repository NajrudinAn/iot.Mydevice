const Workspace = require('../models/workspace');

const createWorkspace = async (req, res, next) => {
    try {
        const { name } = req.body;
        const ownerId = req.user.id;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Workspace name is required' });
        }

        const workspace = await Workspace.create(name, ownerId);
        
        return res.status(201).json({
            success: true,
            message: 'Workspace created successfully',
            workspace
        });
    } catch (err) {
        next(err);
    }
};

const getWorkspaces = async (req, res, next) => {
    try {
        const ownerId = req.user.id;
        const workspaces = await Workspace.findByOwnerId(ownerId);
        
        return res.json({
            success: true,
            workspaces
        });
    } catch (err) {
        next(err);
    }
};

const getWorkspaceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ownerId = req.user.id;

        const workspace = await Workspace.findByIdAndOwnerId(id, ownerId);
        
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        const stats = await Workspace.getOverviewStats(id, ownerId);

        return res.json({
            success: true,
            workspace: {
                ...workspace,
                ...stats // mix in total_devices, online_devices, etc.
            }
        });
    } catch (err) {
        next(err);
    }
};

const updateWorkspace = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ownerId = req.user.id;
        const { command_history_retention_seconds, name } = req.body;

        const workspace = await Workspace.findByIdAndOwnerId(id, ownerId);
        
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        // Handle rename
        if (name && name.trim()) {
            await Workspace.updateName(id, ownerId, name.trim());
            workspace.name = name.trim();
        }

        // Validate values as per requirements (1h, 2h, 24h, 7d, 30d, forever)
        const validValues = [3600, 7200, 86400, 604800, 2592000, null];
        if (command_history_retention_seconds !== undefined) {
            if (!validValues.includes(command_history_retention_seconds)) {
                 return res.status(400).json({ success: false, message: 'Invalid retention value' });
            }
            
            const pool = require('../config/db');
            await pool.query(
                'UPDATE workspaces SET command_history_retention_seconds = $1 WHERE id = $2',
                [command_history_retention_seconds, id]
            );
            workspace.command_history_retention_seconds = command_history_retention_seconds;
        }

        return res.json({
            success: true,
            message: 'Workspace updated successfully',
            workspace
        });
    } catch (err) {
        next(err);
    }
};

const deleteWorkspace = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ownerId = req.user.id;
        
        const deleted = await Workspace.delete(id, ownerId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Workspace not found or unauthorized' });
        }
        
        return res.json({ success: true, message: 'Workspace deleted successfully' });
    } catch (err) {
        next(err);
    }
};

const getWorkspaceUsers = async (req, res, next) => {
    try {
        const { workspace_id } = req.params;
        const ownerId = req.user.id;

        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, ownerId);
        if (!workspace) {
            return res.status(404).json({ success: false, message: 'Workspace not found' });
        }

        const db = require('../config/db');
        
        // Get owner
        const ownerRes = await db.query('SELECT id, name, email FROM users WHERE id = $1', [ownerId]);
        const owner = { ...ownerRes.rows[0], role: 'WORKSPACE_OWNER' };

        // Get application users
        const appUsersRes = await db.query(`
            SELECT DISTINCT ON (u.id)
                u.id, u.name, u.email,
                au.role as application_role,
                a.name as application_name
            FROM users u
            JOIN application_users au ON u.id = au.user_id
            JOIN applications a ON au.application_id = a.id
            WHERE a.workspace_id = $1 AND u.id != $2
        `, [workspace_id, ownerId]);

        const users = [owner, ...appUsersRes.rows];

        return res.json({ success: true, users });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createWorkspace,
    getWorkspaces,
    getWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceUsers
};
