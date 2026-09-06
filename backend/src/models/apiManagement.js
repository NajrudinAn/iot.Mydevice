const { pool } = require('../config/db');
const crypto = require('crypto');

class ApiManagement {
    
    // ==========================================
    // API ROUTES
    // ==========================================

    static async getRoutes(workspaceId) {
        const result = await pool.query(`
            SELECT r.*, r.calls_count,
                   (SELECT count(*) FROM api_api_routes WHERE api_route_id = r.id) as usage_count,
                   (SELECT count(*) FROM api_route_devices WHERE api_route_id = r.id) as device_count,
                   ARRAY(SELECT device_id FROM api_route_devices WHERE api_route_id = r.id) as devices,
                   ARRAY(SELECT field_path FROM api_route_data_permissions WHERE api_route_id = r.id) as data_fields,
                   ARRAY(SELECT command_type FROM api_route_command_permissions WHERE api_route_id = r.id) as commands
            FROM api_routes r
            WHERE r.workspace_id = $1
            ORDER BY r.created_at DESC
        `, [workspaceId]);
        return result.rows;
    }

    static async getRouteById(routeId, workspaceId) {
        const result = await pool.query('SELECT * FROM api_routes WHERE id = $1 AND workspace_id = $2', [routeId, workspaceId]);
        if (result.rows.length === 0) return null;
        const route = result.rows[0];

        // Fetch scoped devices
        const deviceRes = await pool.query('SELECT device_id FROM api_route_devices WHERE api_route_id = $1', [routeId]);
        route.devices = deviceRes.rows.map(r => r.device_id);

        // Fetch data permissions
        const dataRes = await pool.query('SELECT field_path FROM api_route_data_permissions WHERE api_route_id = $1', [routeId]);
        route.data_fields = dataRes.rows.map(r => r.field_path);

        // Fetch command permissions
        const cmdRes = await pool.query('SELECT command_type FROM api_route_command_permissions WHERE api_route_id = $1', [routeId]);
        route.commands = cmdRes.rows.map(r => r.command_type);

        return route;
    }

    static async createRoute(workspaceId, data, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const baseSlug = (data.name || 'route').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const endpointSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
            
            let method = 'GET';
            if (data.purpose === 'COMMAND') {
                method = 'POST';
            }

            const res = await client.query(`
                INSERT INTO api_routes (workspace_id, name, description, method, endpoint_slug, purpose, device_scope, is_active, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
            `, [
                workspaceId, data.name, data.description || '', method, endpointSlug, 
                data.purpose, data.device_scope, true, userId
            ]);

            const routeId = res.rows[0].id;

            // Insert devices
            if ((data.device_scope === 'SELECTED' || data.device_scope === 'SINGLE') && Array.isArray(data.devices)) {
                for (const deviceId of data.devices) {
                    await client.query('INSERT INTO api_route_devices (api_route_id, device_id) VALUES ($1, $2)', [routeId, deviceId]);
                }
            }

            // Insert data fields
            if (Array.isArray(data.data_fields)) {
                for (const field of data.data_fields) {
                    await client.query('INSERT INTO api_route_data_permissions (api_route_id, field_path) VALUES ($1, $2)', [routeId, field]);
                }
            }

            // Insert commands
            if (Array.isArray(data.commands)) {
                for (const cmd of data.commands) {
                    await client.query('INSERT INTO api_route_command_permissions (api_route_id, command_type) VALUES ($1, $2)', [routeId, cmd]);
                }
            }

            await client.query('COMMIT');
            return await this.getRouteById(routeId, workspaceId);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async updateRoute(routeId, workspaceId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Check existence
            const exist = await client.query('SELECT id FROM api_routes WHERE id = $1 AND workspace_id = $2', [routeId, workspaceId]);
            if (exist.rows.length === 0) throw new Error('NOT_FOUND');

            if (data.name !== undefined || data.purpose !== undefined || data.device_scope !== undefined || data.is_active !== undefined) {
                let method = undefined;
                if (data.purpose) {
                    method = data.purpose === 'COMMAND' ? 'POST' : 'GET';
                }

                await client.query(`
                    UPDATE api_routes SET 
                        name = COALESCE($1, name),
                        description = COALESCE($2, description),
                        method = COALESCE($3, method),
                        purpose = COALESCE($4, purpose),
                        device_scope = COALESCE($5, device_scope),
                        is_active = COALESCE($6, is_active),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $7
                `, [data.name, data.description, method, data.purpose, data.device_scope, data.is_active, routeId]);
            }

            // Update nested scopes if provided
            if (data.devices) {
                await client.query('DELETE FROM api_route_devices WHERE api_route_id = $1', [routeId]);
                if (data.device_scope === 'SELECTED' || data.device_scope === 'SINGLE') {
                    for (const deviceId of data.devices) {
                        await client.query('INSERT INTO api_route_devices (api_route_id, device_id) VALUES ($1, $2)', [routeId, deviceId]);
                    }
                }
            }

            if (data.data_fields) {
                await client.query('DELETE FROM api_route_data_permissions WHERE api_route_id = $1', [routeId]);
                for (const field of data.data_fields) {
                    await client.query('INSERT INTO api_route_data_permissions (api_route_id, field_path) VALUES ($1, $2)', [routeId, field]);
                }
            }

            if (data.commands) {
                await client.query('DELETE FROM api_route_command_permissions WHERE api_route_id = $1', [routeId]);
                for (const cmd of data.commands) {
                    await client.query('INSERT INTO api_route_command_permissions (api_route_id, command_type) VALUES ($1, $2)', [routeId, cmd]);
                }
            }

            await client.query('COMMIT');
            return await this.getRouteById(routeId, workspaceId);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async deleteRoute(routeId, workspaceId) {
        // Will cascade delete route link from APIs
        await pool.query('DELETE FROM api_routes WHERE id = $1 AND workspace_id = $2', [routeId, workspaceId]);
    }


    // ==========================================
    // APIs
    // ==========================================

    static async getApis(workspaceId) {
        const result = await pool.query(`
            SELECT a.*,
                   (SELECT count(*) FROM api_api_routes WHERE api_id = a.id) as route_count,
                   (SELECT count(*) FROM api_credentials WHERE api_id = a.id AND status = 'ACTIVE') as credential_count,
                   (SELECT count(*) FROM api_user_access WHERE api_id = a.id) as user_count,
                   (
                       SELECT COALESCE(json_agg(r.*), '[]'::json)
                       FROM api_routes r
                       JOIN api_api_routes ar ON r.id = ar.api_route_id
                       WHERE ar.api_id = a.id
                   ) as routes
            FROM apis a
            WHERE a.workspace_id = $1
            ORDER BY a.created_at DESC
        `, [workspaceId]);
        return result.rows;
    }

    static async getApiById(apiId, workspaceId) {
        const result = await pool.query('SELECT * FROM apis WHERE id = $1 AND workspace_id = $2', [apiId, workspaceId]);
        if (result.rows.length === 0) return null;
        const api = result.rows[0];

        // Fetch routes
        const routesRes = await pool.query(`
            SELECT r.* FROM api_routes r
            JOIN api_api_routes ar ON r.id = ar.api_route_id
            WHERE ar.api_id = $1
        `, [apiId]);
        api.routes = routesRes.rows;

        // Fetch credentials
        const credRes = await pool.query(`
            SELECT id, name, api_key, status, created_at, last_used_at, revoked_at 
            FROM api_credentials WHERE api_id = $1 ORDER BY created_at DESC
        `, [apiId]);
        api.credentials = credRes.rows;

        // Fetch users
        const userRes = await pool.query(`
            SELECT u.*, aua.id as access_id 
            FROM application_users u
            JOIN api_user_access aua ON u.id = aua.app_user_id
            WHERE aua.api_id = $1
        `, [apiId]);
        api.users = userRes.rows;

        // Build dynamic_schema for routes
        for (const route of api.routes) {
            route.dynamic_schema = {
                data_payload: {},
                commands_schema: {},
                devices: []
            };

            // Find targeted devices
            let targetDevices = [];
            if (route.device_scope === 'SELECTED' || route.device_scope === 'SINGLE') {
                const devRes = await pool.query('SELECT device_id FROM api_route_devices WHERE api_route_id = $1', [route.id]);
                targetDevices = devRes.rows.map(r => r.device_id);
            } else {
                const allDevRes = await pool.query('SELECT id FROM devices WHERE workspace_id = $1', [workspaceId]);
                targetDevices = allDevRes.rows.map(r => r.id);
            }

            if (targetDevices.length > 0) {
                // Fetch DEVICE_STATUS profiles
                const devicesRes = await pool.query(`SELECT id, device_id, name, status, last_seen FROM devices WHERE id = ANY($1) LIMIT 5`, [targetDevices]);
                route.dynamic_schema.devices = devicesRes.rows;

                // Build DATA PAYLOAD schema (CURRENT_DATA, HISTORY, REALTIME)
                if (['CURRENT_DATA', 'HISTORY', 'REALTIME'].includes(route.purpose)) {
                    // Fetch all fields for these devices
                    const fieldsRes = await pool.query(`
                        SELECT DISTINCT field_name, data_type 
                        FROM device_data_fields df
                        JOIN devices d ON df.device_id = d.device_id
                        WHERE d.id = ANY($1)
                    `, [targetDevices]);

                    // Filter by data_permissions if provided
                    const allPermissions = await pool.query('SELECT field_path FROM api_route_data_permissions WHERE api_route_id = $1', [route.id]);
                    const allowedFields = allPermissions.rows.map(r => r.field_path);
                    const isGlobal = allowedFields.length === 0;

                    const schemaObj = {};
                    fieldsRes.rows.forEach(f => {
                        const pureFieldPath = f.field_name;
                        // For 'Selected Fields', allowedFields are formatted as 'UUID::field_path'
                        // So we check if ANY of the target devices explicitly allowed this field
                        const isAllowed = isGlobal || targetDevices.some(deviceId => allowedFields.includes(`${deviceId}::${pureFieldPath}`));
                        
                        if (isAllowed) {
                            const parts = pureFieldPath.split('.');
                            let current = schemaObj;
                            for (let i = 0; i < parts.length - 1; i++) {
                                if (!current[parts[i]]) current[parts[i]] = {};
                                current = current[parts[i]];
                            }
                            current[parts[parts.length - 1]] = `<${f.data_type}>`;
                        }
                    });
                    route.dynamic_schema.data_payload = schemaObj;
                }

                // Build COMMAND schema
                if (route.purpose === 'COMMAND') {
                    // Fetch all capability actions for these devices
                    const capRes = await pool.query(`
                        SELECT DISTINCT a.name, a.parameters
                        FROM device_capability_actions a
                        JOIN device_capabilities c ON a.capability_id = c.id
                        WHERE c.device_id = ANY($1)
                    `, [targetDevices]);

                    // Filter by command_permissions if provided
                    const allCmdPermissions = await pool.query('SELECT command_type FROM api_route_command_permissions WHERE api_route_id = $1', [route.id]);
                    const allowedCommandsList = allCmdPermissions.rows.map(r => r.command_type);
                    const isCmdGlobal = allowedCommandsList.includes('ALL_COMMANDS_PERMITTED_BY_ROUTE') || allowedCommandsList.length === 0;

                    const cmdObj = {};
                    capRes.rows.forEach(row => {
                        if (isCmdGlobal || allowedCommandsList.includes(row.name)) {
                            cmdObj[row.name] = row.parameters || {};
                        }
                    });
                    route.dynamic_schema.commands_schema = cmdObj;
                }
            }
        }

        return api;
    }

    static async createApi(workspaceId, data, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const baseSlug = (data.name || 'api').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const apiSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
            const authMode = data.auth_mode || 'API_KEY_SECRET';

            // Validate that we don't attach COMMAND routes to PUBLIC_READ_ONLY APIs
            if (authMode === 'PUBLIC_READ_ONLY' && Array.isArray(data.route_ids) && data.route_ids.length > 0) {
                const routeCheck = await client.query('SELECT purpose FROM api_routes WHERE id = ANY($1)', [data.route_ids]);
                const hasUnsafeRoutes = routeCheck.rows.some(r => r.purpose === 'COMMAND' || r.method === 'POST' || r.method === 'PUT' || r.method === 'DELETE');
                if (hasUnsafeRoutes) {
                    throw new Error('UNSAFE_ROUTES_NOT_ALLOWED');
                }
            }

            const res = await client.query(`
                INSERT INTO apis (workspace_id, name, description, status, auth_mode, api_slug, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
            `, [workspaceId, data.name, data.description || '', data.status || 'ACTIVE', authMode, apiSlug, userId]);
            const apiId = res.rows[0].id;

            if (Array.isArray(data.route_ids)) {
                for (const routeId of data.route_ids) {
                    await client.query('INSERT INTO api_api_routes (api_id, api_route_id) VALUES ($1, $2)', [apiId, routeId]);
                }
            }
            await client.query('COMMIT');
            return await this.getApiById(apiId, workspaceId);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async updateApi(apiId, workspaceId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const exist = await client.query('SELECT id, auth_mode FROM apis WHERE id = $1 AND workspace_id = $2', [apiId, workspaceId]);
            if (exist.rows.length === 0) throw new Error('NOT_FOUND');

            const finalAuthMode = data.auth_mode || exist.rows[0].auth_mode;

            // Fetch final list of route IDs to validate
            let routeIdsToValidate = data.route_ids;
            if (!routeIdsToValidate) {
                // If we aren't changing routes, we still need to validate existing routes if auth_mode is changing to PUBLIC
                if (data.auth_mode === 'PUBLIC_READ_ONLY' && exist.rows[0].auth_mode !== 'PUBLIC_READ_ONLY') {
                    const existingRoutes = await client.query('SELECT api_route_id FROM api_api_routes WHERE api_id = $1', [apiId]);
                    routeIdsToValidate = existingRoutes.rows.map(r => r.api_route_id);
                }
            }

            if (finalAuthMode === 'PUBLIC_READ_ONLY' && routeIdsToValidate && routeIdsToValidate.length > 0) {
                const routeCheck = await client.query('SELECT purpose, method FROM api_routes WHERE id = ANY($1)', [routeIdsToValidate]);
                const hasUnsafeRoutes = routeCheck.rows.some(r => r.purpose === 'COMMAND' || r.method === 'POST' || r.method === 'PUT' || r.method === 'DELETE');
                if (hasUnsafeRoutes) {
                    throw new Error('UNSAFE_ROUTES_NOT_ALLOWED');
                }
            }

            if (data.name !== undefined || data.auth_mode !== undefined || data.status !== undefined) {
                await client.query(`
                    UPDATE apis SET 
                        name = COALESCE($1, name), 
                        description = COALESCE($2, description), 
                        status = COALESCE($3, status), 
                        auth_mode = COALESCE($4, auth_mode),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $5
                `, [data.name, data.description, data.status, data.auth_mode, apiId]);
            }

            if (data.route_ids) {
                await client.query('DELETE FROM api_api_routes WHERE api_id = $1', [apiId]);
                for (const routeId of data.route_ids) {
                    await client.query('INSERT INTO api_api_routes (api_id, api_route_id) VALUES ($1, $2)', [apiId, routeId]);
                }
            }

            await client.query('COMMIT');
            return await this.getApiById(apiId, workspaceId);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async deleteApi(apiId, workspaceId) {
        // Deleting API preserves routes (only api_api_routes is cascaded).
        await pool.query('DELETE FROM apis WHERE id = $1 AND workspace_id = $2', [apiId, workspaceId]);
    }

    // ==========================================
    // CREDENTIALS
    // ==========================================

    static _hashSecret(secret) {
        return crypto.createHash('sha256').update(secret).digest('hex');
    }

    static async createCredential(apiId, data, userId) {
        const apiKey = 'ds_' + crypto.randomBytes(12).toString('hex');
        const secret = crypto.randomBytes(32).toString('base64url');
        
        const bcrypt = require('bcryptjs');
        const secretHash = await bcrypt.hash(secret, 10);

        const res = await pool.query(`
            INSERT INTO api_credentials (api_id, name, api_key, secret_hash, created_by)
            VALUES ($1, $2, $3, $4, $5) RETURNING id, name, api_key, created_at, status
        `, [apiId, data.name, apiKey, secretHash, userId]);

        return {
            ...res.rows[0],
            secret // ONLY RETURNED ONCE!
        };
    }

    static async revokeCredential(credentialId, apiId) {
        await pool.query(`
            UPDATE api_credentials 
            SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND api_id = $2
        `, [credentialId, apiId]);
    }

    // ==========================================
    // USER ACCESS
    // ==========================================

    static async addUser(apiId, appUserId, userId) {
        await pool.query(`
            INSERT INTO api_user_access (api_id, app_user_id, created_by)
            VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
        `, [apiId, appUserId, userId]);
    }

    static async removeUser(accessId, apiId) {
        await pool.query('DELETE FROM api_user_access WHERE id = $1 AND api_id = $2', [accessId, apiId]);
    }

}

module.exports = ApiManagement;
