const pool = require('../config/db');

class ApplicationUserDevicePermission {
    static async getPermissions(applicationId, userId, deviceId) {
        const query = `
            SELECT can_view, can_read_data, can_command
            FROM application_user_device_permissions
            WHERE application_id = $1 AND user_id = $2 AND device_id = $3;
        `;
        const result = await pool.query(query, [applicationId, userId, deviceId]);
        return result.rows[0]; // Returns undefined if not set
    }

    static async upsertPermissions(applicationId, userId, deviceId, canView, canReadData, canCommand) {
        const query = `
            INSERT INTO application_user_device_permissions (application_id, user_id, device_id, can_view, can_read_data, can_command)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (application_id, user_id, device_id)
            DO UPDATE SET 
                can_view = EXCLUDED.can_view,
                can_read_data = EXCLUDED.can_read_data,
                can_command = EXCLUDED.can_command,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        const result = await pool.query(query, [applicationId, userId, deviceId, canView, canReadData, canCommand]);
        return result.rows[0];
    }
}

module.exports = ApplicationUserDevicePermission;
