const { pool } = require('../config/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Middleware to authenticate and authorize runtime API requests.
 */
const apiExecutionAuth = async (req, res, next) => {
    try {
        const isPublicNamespace = req.baseUrl === '/api/v1/public';
        let endpointSlug = '';
        let apiSlug = '';

        if (isPublicNamespace) {
            // URL: /api/v1/public/:api_slug/:endpoint_slug
            const parts = req.path.split('/').filter(Boolean);
            if (parts.length < 2) {
                return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
            }
            apiSlug = parts[0];
            endpointSlug = parts[1];
        } else {
            // URL: /api/v1/routes/:endpoint_slug
            const parts = req.path.split('/').filter(Boolean);
            if (parts.length < 1) {
                return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
            }
            endpointSlug = parts[0];
        }

        // 1. Find Route by endpoint_slug
        const routeRes = await pool.query('SELECT * FROM api_routes WHERE endpoint_slug = $1 AND is_active = true', [endpointSlug]);
        if (routeRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found or disabled' } });
        }
        const route = routeRes.rows[0];
        const workspaceId = route.workspace_id;

        // Verify HTTP method
        if (req.method !== route.method) {
            if (req.method === 'GET' && route.purpose === 'COMMAND') {
                req.isSchemaRequest = true;
            } else {
                return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed for this route` } });
            }
        }

        let apiId = null;
        let authMethod = '';
        let appUserId = null;

        // 2. Identify Caller and Enforce API Access
        if (isPublicNamespace) {
            if (route.purpose === 'COMMAND' || route.method !== 'GET') {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Command and write routes cannot be executed publicly' } });
            }

            const apiRes = await pool.query(`
                SELECT a.id, a.auth_mode 
                FROM apis a
                JOIN api_api_routes aar ON a.id = aar.api_id
                WHERE a.api_slug = $1 AND aar.api_route_id = $2 AND a.status = 'ACTIVE'
            `, [apiSlug, route.id]);

            if (apiRes.rows.length === 0) {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'API does not expose this route publicly' } });
            }

            if (apiRes.rows[0].auth_mode !== 'PUBLIC_READ_ONLY') {
                return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'This API requires authentication' } });
            }

            apiId = apiRes.rows[0].id;
            authMethod = 'PUBLIC_READ_ONLY';

        } else {
            const apiKey = req.headers['x-api-key'];
            const apiSecret = req.headers['x-api-secret'];
            const authHeader = req.headers['authorization'];
            
            const appApiKey = req.headers['x-app-key'];
            const appApiSecret = req.headers['x-app-secret'];

            if (appApiKey && appApiSecret) {
                const appRes = await pool.query('SELECT * FROM applications WHERE api_key = $1', [appApiKey]);
                if (appRes.rows.length === 0) {
                    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid Application API Key' } });
                }
                const application = appRes.rows[0];

                const secretHash = crypto.createHash('sha256').update(appApiSecret).digest('hex');
                if (secretHash !== application.api_secret_hash) {
                    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid Application API Secret' } });
                }

                // Check if this application has access to the API that exposes this route
                const accessRes = await pool.query(`
                    SELECT a.id 
                    FROM apis a
                    JOIN application_api_access aaa ON a.id = aaa.api_id
                    JOIN api_api_routes aar ON a.id = aar.api_id
                    WHERE aaa.application_id = $1 AND aar.api_route_id = $2 
                      AND a.status = 'ACTIVE'
                    LIMIT 1
                `, [application.id, route.id]);

                if (accessRes.rows.length === 0) {
                    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Application does not have access to any API exposing this Route' } });
                }

                apiId = accessRes.rows[0].id;
                authMethod = 'APPLICATION_STATIC_KEY';
                
            } else if (apiKey && apiSecret) {
                const credRes = await pool.query(`
                    SELECT ac.*, a.workspace_id, a.status as api_status, a.auth_mode
                    FROM api_credentials ac
                    JOIN apis a ON ac.api_id = a.id
                    WHERE ac.api_key = $1 AND ac.status = 'ACTIVE'
                `, [apiKey]);

                if (credRes.rows.length === 0) {
                    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API Key' } });
                }
                const apiCredential = credRes.rows[0];

                let isValidSecret = false;
                if (apiCredential.secret_hash.startsWith('$2')) {
                    isValidSecret = await bcrypt.compare(apiSecret, apiCredential.secret_hash);
                } else {
                    const secretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
                    isValidSecret = (secretHash === apiCredential.secret_hash);
                }

                if (!isValidSecret) {
                    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API Secret' } });
                }

                if (apiCredential.api_status !== 'ACTIVE') {
                    return res.status(403).json({ success: false, error: { code: 'API_DISABLED', message: 'API is currently disabled' } });
                }

                if (apiCredential.auth_mode !== 'API_KEY_SECRET') {
                    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'API does not support API Key authentication' } });
                }

                const linkRes = await pool.query('SELECT id FROM api_api_routes WHERE api_id = $1 AND api_route_id = $2', [apiCredential.api_id, route.id]);
                if (linkRes.rows.length === 0) {
                    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'API credential does not have access to this Route' } });
                }

                apiId = apiCredential.api_id;
                authMethod = 'API_KEY_SECRET';

                await pool.query('UPDATE api_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiCredential.id]);
                await pool.query('UPDATE apis SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiId]);

            } else if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    
                    let applicationIds = [];
                    
                    if (decoded.applicationId) {
                        // Application Token
                        applicationIds = [decoded.applicationId];
                    } else {
                        // Platform Token - Get all applications in this workspace the user is a member of
                        const userRes = await pool.query(`
                            SELECT app.id as application_id
                            FROM application_users au
                            JOIN applications app ON au.application_id = app.id
                            WHERE au.user_id = $1 AND app.workspace_id = $2
                        `, [decoded.id, workspaceId]);
                        
                        applicationIds = userRes.rows.map(row => row.application_id);
                    }
                    
                    if (applicationIds.length === 0) {
                        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'User does not belong to any Application in this workspace' } });
                    }

                    const accessRes = await pool.query(`
                        SELECT a.id 
                        FROM apis a
                        JOIN application_api_access aaa ON a.id = aaa.api_id
                        JOIN api_api_routes aar ON a.id = aar.api_id
                        WHERE aaa.application_id = ANY($1::uuid[]) AND aar.api_route_id = $2 
                          AND a.status = 'ACTIVE' AND a.auth_mode = 'APPLICATION_SESSION'
                        LIMIT 1
                    `, [applicationIds, route.id]);

                    if (accessRes.rows.length === 0) {
                        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'User does not have access to any API exposing this Route' } });
                    }
                    apiId = accessRes.rows[0].id;
                    authMethod = 'APPLICATION_SESSION';
                    userId = decoded.id;
                } catch (e) {
                    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
                }
            } else {
                return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
            }
        }

        // 3. Fetch Scopes (Intersection)
        let allowedDevices = [];
        if (route.device_scope === 'SELECTED' || route.device_scope === 'SINGLE') {
            const devRes = await pool.query('SELECT device_id FROM api_route_devices WHERE api_route_id = $1', [route.id]);
            allowedDevices = devRes.rows.map(r => r.device_id);
        } else {
            const allDevRes = await pool.query('SELECT id FROM devices WHERE workspace_id = $1', [workspaceId]);
            allowedDevices = allDevRes.rows.map(r => r.id);
        }

        const dataRes = await pool.query('SELECT field_path FROM api_route_data_permissions WHERE api_route_id = $1', [route.id]);
        const allowedDataFields = dataRes.rows.map(r => r.field_path);

        const cmdRes = await pool.query('SELECT command_type FROM api_route_command_permissions WHERE api_route_id = $1', [route.id]);
        const allowedCommands = cmdRes.rows.map(r => r.command_type);

        req.apiContext = {
            workspaceId,
            apiId,
            route,
            authMethod,
            allowedDevices,
            allowedDataFields,
            allowedCommands,
            appUserId
        };

        // Increment the route usage count
        await pool.query('UPDATE api_routes SET calls_count = calls_count + 1 WHERE id = $1', [route.id]);

        next();
    } catch (err) {
        console.error('apiExecutionAuth Error:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error during authorization' } });
    }
};

module.exports = { apiExecutionAuth };
