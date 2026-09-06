const pool = require('../config/db');

exports.getPlatformStats = async (req, res, next) => {
    try {
        const ownerId = req.user.id;
        const client = await pool.pool.connect();
        
        try {
            let workspacesCount = 0;
            let applicationsCount = 0;
            let devicesTotal = 0;
            let devicesOnline = 0;
            let usersCount = 0;
            let topAppsRes = null;

            if (req.user.is_platform_admin) {
                // Global stats
                const wsRes = await client.query('SELECT COUNT(*) FROM workspaces');
                workspacesCount = parseInt(wsRes.rows[0].count, 10);
                
                const appRes = await client.query('SELECT COUNT(*) FROM applications');
                applicationsCount = parseInt(appRes.rows[0].count, 10);
                
                const devRes = await client.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'online') as online
                    FROM devices
                `);
                devicesTotal = parseInt(devRes.rows[0].total, 10);
                devicesOnline = parseInt(devRes.rows[0].online, 10);
                
                const usrRes = await client.query('SELECT COUNT(*) FROM users');
                usersCount = parseInt(usrRes.rows[0].count, 10);
                
                topAppsRes = await client.query(`
                    SELECT 
                        a.id, a.name, a.created_at,
                        w.name as workspace_name,
                        (SELECT COUNT(*) FROM application_devices ad WHERE ad.application_id = a.id) as device_count,
                        (SELECT COUNT(*) FROM application_users au WHERE au.application_id = a.id) as user_count
                    FROM applications a
                    JOIN workspaces w ON a.workspace_id = w.id
                    ORDER BY a.created_at DESC
                    LIMIT 5
                `);
            } else {
                // Workspace Owner scoped stats
                const wsRes = await client.query('SELECT COUNT(*) FROM workspaces WHERE owner_id = $1', [ownerId]);
                workspacesCount = parseInt(wsRes.rows[0].count, 10);
                
                const appRes = await client.query(`
                    SELECT COUNT(*) FROM applications a
                    JOIN workspaces w ON a.workspace_id = w.id
                    WHERE w.owner_id = $1
                `, [ownerId]);
                applicationsCount = parseInt(appRes.rows[0].count, 10);
                
                const devRes = await client.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'online') as online
                    FROM devices d
                    JOIN workspaces w ON d.workspace_id = w.id
                    WHERE w.owner_id = $1
                `, [ownerId]);
                devicesTotal = parseInt(devRes.rows[0].total, 10);
                devicesOnline = parseInt(devRes.rows[0].online, 10);
                
                const usrRes = await client.query(`
                    SELECT COUNT(DISTINCT au.user_id) 
                    FROM application_users au
                    JOIN applications a ON au.application_id = a.id
                    JOIN workspaces w ON a.workspace_id = w.id
                    WHERE w.owner_id = $1
                `, [ownerId]);
                usersCount = parseInt(usrRes.rows[0].count, 10);
                
                topAppsRes = await client.query(`
                    SELECT 
                        a.id, a.name, a.created_at,
                        w.name as workspace_name,
                        (SELECT COUNT(*) FROM application_devices ad WHERE ad.application_id = a.id) as device_count,
                        (SELECT COUNT(*) FROM application_users au WHERE au.application_id = a.id) as user_count
                    FROM applications a
                    JOIN workspaces w ON a.workspace_id = w.id
                    WHERE w.owner_id = $1
                    ORDER BY a.created_at DESC
                    LIMIT 5
                `, [ownerId]);
            }

            res.json({
                success: true,
                stats: {
                    workspaces: workspacesCount,
                    applications: applicationsCount,
                    devices: {
                        total: devicesTotal,
                        online: devicesOnline
                    },
                    users: usersCount,
                    topApplications: topAppsRes.rows
                }
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

exports.getPlatformWorkspaces = async (req, res, next) => {
    try {
        const ownerId = req.user.id;
        const client = await pool.pool.connect();
        
        try {
            // Get all workspaces with aggregated stats
            let wsRes;
            
            if (req.user.is_platform_admin) {
                wsRes = await client.query(`
                    SELECT 
                        w.id, 
                        w.name, 
                        w.created_at,
                        u.name as owner_name,
                        (SELECT COUNT(*) FROM applications a WHERE a.workspace_id = w.id) as application_count,
                        (SELECT COUNT(*) FROM devices d WHERE d.workspace_id = w.id) as device_count,
                        (
                            SELECT COUNT(DISTINCT au.user_id) 
                            FROM application_users au 
                            JOIN applications a ON au.application_id = a.id 
                            WHERE a.workspace_id = w.id
                        ) as user_count
                    FROM workspaces w
                    JOIN users u ON w.owner_id = u.id
                    ORDER BY w.created_at DESC
                `);
            } else {
                wsRes = await client.query(`
                    SELECT 
                        w.id, 
                        w.name, 
                        w.created_at,
                        u.name as owner_name,
                        (SELECT COUNT(*) FROM applications a WHERE a.workspace_id = w.id) as application_count,
                        (SELECT COUNT(*) FROM devices d WHERE d.workspace_id = w.id) as device_count,
                        (
                            SELECT COUNT(DISTINCT au.user_id) 
                            FROM application_users au 
                            JOIN applications a ON au.application_id = a.id 
                            WHERE a.workspace_id = w.id
                        ) as user_count
                    FROM workspaces w
                    JOIN users u ON w.owner_id = u.id
                    WHERE w.owner_id = $1
                    ORDER BY w.created_at DESC
                `, [ownerId]);
            }
            
            res.json({
                success: true,
                workspaces: wsRes.rows
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

exports.getPlatformApplications = async (req, res, next) => {
    try {
        const ownerId = req.user.id;
        const client = await pool.pool.connect();
        
        try {
            let appRes;
            
            if (req.user.is_platform_admin) {
                appRes = await client.query(`
                    SELECT 
                        a.id, 
                        a.workspace_id,
                        a.name, 
                        a.slug,
                        a.created_at,
                        w.name as workspace_name,
                        (SELECT COUNT(*) FROM application_devices ad WHERE ad.application_id = a.id) as device_count,
                        (SELECT COUNT(*) FROM application_users au WHERE au.application_id = a.id) as user_count,
                        (SELECT COUNT(*) FROM dashboard_pages dp JOIN dashboards d ON dp.dashboard_id = d.id WHERE d.application_id = a.id) as dashboard_count,
                        (SELECT COUNT(*) FROM api_definitions api WHERE api.application_id = a.id) as api_count
                    FROM applications a
                    JOIN workspaces w ON a.workspace_id = w.id
                    ORDER BY a.created_at DESC
                `);
            } else {
                appRes = await client.query(`
                    SELECT 
                        a.id, 
                        a.workspace_id,
                        a.name, 
                        a.slug,
                        a.created_at,
                        w.name as workspace_name,
                        (SELECT COUNT(*) FROM application_devices ad WHERE ad.application_id = a.id) as device_count,
                        (SELECT COUNT(*) FROM application_users au WHERE au.application_id = a.id) as user_count,
                        (SELECT COUNT(*) FROM dashboard_pages dp JOIN dashboards d ON dp.dashboard_id = d.id WHERE d.application_id = a.id) as dashboard_count,
                        (SELECT COUNT(*) FROM api_definitions api WHERE api.application_id = a.id) as api_count
                    FROM applications a
                    JOIN workspaces w ON a.workspace_id = w.id
                    WHERE w.owner_id = $1
                    ORDER BY a.created_at DESC
                `, [ownerId]);
            }
            
            res.json({
                success: true,
                applications: appRes.rows
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

exports.getPlatformUsers = async (req, res, next) => {
    try {
        if (!req.user.is_platform_admin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Platform Admin only' });
        }
        
        const client = await pool.pool.connect();
        try {
            const userRes = await client.query(`
                SELECT id, name, email, is_platform_admin, created_at 
                FROM users 
                ORDER BY created_at DESC
            `);
            
            res.json({
                success: true,
                users: userRes.rows
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

exports.promoteToPlatformAdmin = async (req, res, next) => {
    try {
        if (!req.user.is_platform_admin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Platform Admin only' });
        }
        
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const client = await pool.pool.connect();
        try {
            const updateRes = await client.query(`
                UPDATE users 
                SET is_platform_admin = true 
                WHERE id = $1 
                RETURNING id, name, email, is_platform_admin
            `, [userId]);
            
            if (updateRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            res.json({
                success: true,
                user: updateRes.rows[0],
                message: 'User promoted to Platform Admin successfully'
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

exports.demoteFromPlatformAdmin = async (req, res, next) => {
    try {
        if (!req.user.is_platform_admin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Platform Admin only' });
        }
        
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        
        if (userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot demote yourself' });
        }

        const client = await pool.pool.connect();
        try {
            const updateRes = await client.query(`
                UPDATE users 
                SET is_platform_admin = false 
                WHERE id = $1 
                RETURNING id, name, email, is_platform_admin
            `, [userId]);
            
            if (updateRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            res.json({
                success: true,
                user: updateRes.rows[0],
                message: 'User demoted to standard user successfully'
            });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};
