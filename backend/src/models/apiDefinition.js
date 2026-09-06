const db = require('../config/db');

class ApiDefinition {
    static async create(applicationId, name, slug, description, authRequired) {
        const query = `
            INSERT INTO api_definitions (application_id, name, slug, description, authentication_required)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await db.query(query, [applicationId, name, slug, description, authRequired]);
        return result.rows[0];
    }

    static async findById(id) {
        const query = 'SELECT * FROM api_definitions WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async findBySlugAndApplication(slug, applicationId) {
        const query = 'SELECT * FROM api_definitions WHERE slug = $1 AND application_id = $2';
        const result = await db.query(query, [slug, applicationId]);
        return result.rows[0];
    }

    static async updateFields(apiId, fields) {
        const query = `
            UPDATE api_definitions
            SET allowed_fields = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;
        const result = await db.query(query, [fields, apiId]);
        return result.rows[0];
    }

    static async addDevice(apiId, deviceId) {
        const query = `
            INSERT INTO api_definition_devices (api_definition_id, device_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING *;
        `;
        const result = await db.query(query, [apiId, deviceId]);
        return result.rows[0];
    }

    static async removeDevice(apiId, deviceId) {
        const query = `
            DELETE FROM api_definition_devices
            WHERE api_definition_id = $1 AND device_id = $2
            RETURNING *;
        `;
        const result = await db.query(query, [apiId, deviceId]);
        return result.rows[0];
    }

    static async getDevices(apiId) {
        const query = `
            SELECT d.* 
            FROM devices d
            JOIN api_definition_devices ad ON d.id = ad.device_id
            WHERE ad.api_definition_id = $1;
        `;
        const result = await db.query(query, [apiId]);
        return result.rows;
    }

    static async checkDeviceAssigned(apiId, deviceId) {
        const query = 'SELECT 1 FROM api_definition_devices WHERE api_definition_id = $1 AND device_id = $2';
        const result = await db.query(query, [apiId, deviceId]);
        return result.rows.length > 0;
    }
}

module.exports = ApiDefinition;
