const pool = require('../config/db');
const crypto = require('crypto');

class Application {
    static async create(workspaceId, name, slug, description, ownerId, authenticationApiId = null, deploymentMode = 'DEVELOPMENT', registrationEnabled = false) {
        const apiKey = 'app_' + crypto.randomBytes(16).toString('hex');
        const rawSecret = crypto.randomBytes(32).toString('hex');
        const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

        const client = await pool.pool.connect();
        try {
            await client.query('BEGIN');
            const insertAppQuery = `
                INSERT INTO applications (workspace_id, name, slug, description, authentication_api_id, deployment_mode, registration_enabled, api_key, api_secret_hash)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *;
            `;
            const appValues = [workspaceId, name, slug, description || null, authenticationApiId, deploymentMode, registrationEnabled, apiKey, secretHash];
            const appResult = await client.query(insertAppQuery, appValues);
            const app = appResult.rows[0];
            
            // Expose the raw secret ONLY upon creation
            app.raw_api_secret = rawSecret;


            const insertUserQuery = `
                INSERT INTO application_users (application_id, user_id, role, status)
                VALUES ($1, $2, 'ADMIN', 'ACTIVE')
            `;
            await client.query(insertUserQuery, [app.id, ownerId]);

            await client.query('COMMIT');
            return app;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async findByWorkspaceId(workspaceId) {
        const query = `
            SELECT * FROM applications
            WHERE workspace_id = $1
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query, [workspaceId]);
        return result.rows;
    }

    static async getSharedApplications(userId) {
        // Find applications where the user is a member (in application_users)
        // BUT they are NOT the owner of the workspace that the application belongs to.
        const query = `
            SELECT a.*, w.name as workspace_name, au.role as user_role, u.name as workspace_owner_name
            FROM applications a
            JOIN application_users au ON a.id = au.application_id
            JOIN workspaces w ON a.workspace_id = w.id
            JOIN users u ON w.owner_id = u.id
            WHERE au.user_id = $1 AND w.owner_id != $1
            ORDER BY a.created_at DESC;
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT * FROM applications
            WHERE id = $1;
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findBySlug(slug) {
        const query = `
            SELECT * FROM applications
            WHERE slug = $1;
        `;
        const result = await pool.query(query, [slug]);
        return result.rows[0];
    }

    static async update(id, name, description, authenticationApiId = null, deploymentMode = 'DEVELOPMENT') {
        const query = `
            UPDATE applications 
            SET name = $2, description = $3, authentication_api_id = $4, deployment_mode = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id, name, description, authenticationApiId, deploymentMode]);
        return result.rows[0];
    }

    static async updateBranding(id, displayName, logoUrl, faviconUrl) {
        const query = `
            UPDATE applications
            SET display_name = $2,
                logo_url = $3,
                favicon_url = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id, displayName, logoUrl, faviconUrl]);
        return result.rows[0];
    }

    static async updateAuthSettings(id, authEnabled, regEnabled, appRequired) {
        const query = `
            UPDATE applications
            SET authentication_enabled = $2,
                registration_enabled = $3,
                approval_required = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id, authEnabled, regEnabled, appRequired]);
        return result.rows[0];
    }

    static async updateRetention(id, dataRetentionDays) {
        const query = `
            UPDATE applications
            SET data_retention_days = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id, dataRetentionDays]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = `
            DELETE FROM applications
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Device Association
    static async assignDevice(applicationId, deviceId) {
        const query = `
            INSERT INTO application_devices (application_id, device_id)
            VALUES ($1, $2)
            ON CONFLICT (application_id, device_id) DO NOTHING
            RETURNING *;
        `;
        const result = await pool.query(query, [applicationId, deviceId]);
        return result.rows[0];
    }

    static async removeDevice(applicationId, deviceId) {
        const query = `
            DELETE FROM application_devices
            WHERE application_id = $1 AND device_id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [applicationId, deviceId]);
        return result.rows[0];
    }

    static async getAssignedDevices(applicationId) {
        // Return device info (excluding secret_key)
        const query = `
            SELECT d.id, d.device_id, d.name, d.status, d.last_seen, d.created_at, d.workspace_id
            FROM devices d
            JOIN application_devices ad ON d.id = ad.device_id
            WHERE ad.application_id = $1
            ORDER BY ad.created_at DESC;
        `;
        const result = await pool.query(query, [applicationId]);
        return result.rows;
    }

    // API Access Management
    static async getApiAccess(applicationId) {
        const query = `
            SELECT api_id 
            FROM application_api_access 
            WHERE application_id = $1;
        `;
        const result = await pool.query(query, [applicationId]);
        return result.rows.map(row => row.api_id);
    }

    static async setApiAccess(applicationId, apiIds) {
        // Begin a simple transaction wrapper logic or just do it sequentially
        const client = await pool.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Delete existing access
            await client.query('DELETE FROM application_api_access WHERE application_id = $1', [applicationId]);
            
            // Insert new access
            if (apiIds && apiIds.length > 0) {
                for (const apiId of apiIds) {
                    await client.query(
                        'INSERT INTO application_api_access (application_id, api_id) VALUES ($1, $2)',
                        [applicationId, apiId]
                    );
                }
            }
            
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async checkDeviceAssigned(applicationId, deviceId) {
        const query = `
            SELECT 1 FROM application_devices
            WHERE application_id = $1 AND device_id = $2;
        `;
        const result = await pool.query(query, [applicationId, deviceId]);
        return result.rows.length > 0;
    }

    static async regenerateApiCredentials(id) {
        const apiKey = 'app_' + crypto.randomBytes(16).toString('hex');
        const rawSecret = crypto.randomBytes(32).toString('hex');
        const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

        const query = `
            UPDATE applications
            SET api_key = $2, api_secret_hash = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id, apiKey, secretHash]);
        const app = result.rows[0];
        if (app) {
            app.raw_api_secret = rawSecret;
        }
        return app;
    }
}

module.exports = Application;
