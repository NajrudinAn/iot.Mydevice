const db = require('../config/db');

class Device {
    static async create(deviceId, secretKey, name, deviceType, userId, workspaceId) {
        const query = `
            INSERT INTO devices (device_id, secret_key, name, device_type, user_id, workspace_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, device_id, name, device_type, status, last_seen, created_at, secret_key, workspace_id
        `;
        const result = await db.query(query, [deviceId, secretKey, name, deviceType, userId, workspaceId]);
        return result.rows[0];
    }

    static async findByUserId(userId) {
        const query = `
            SELECT id, device_id, name, device_type, status, last_seen, created_at, workspace_id 
            FROM devices WHERE user_id = $1
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    static async findByWorkspaceId(workspaceId) {
        const query = `
            SELECT id, device_id, name, device_type, status, last_seen, created_at, workspace_id 
            FROM devices WHERE workspace_id = $1
        `;
        const result = await db.query(query, [workspaceId]);
        return result.rows;
    }

    static async findByIdAndUserId(id, userId) {
        const query = `
            SELECT id, device_id, name, device_type, status, last_seen, created_at, workspace_id 
            FROM devices WHERE id = $1 AND user_id = $2
        `;
        const result = await db.query(query, [id, userId]);
        return result.rows[0];
    }

    static async deleteByIdAndUserId(id, userId) {
        const query = `DELETE FROM devices WHERE id = $1 AND user_id = $2 RETURNING id`;
        const result = await db.query(query, [id, userId]);
        return result.rowCount > 0;
    }

    static async updateName(id, workspaceId, newName) {
        const query = `
            UPDATE devices 
            SET name = $1 
            WHERE id = $2 AND workspace_id = $3
            RETURNING id, name, device_id, device_type, status, last_seen, created_at, workspace_id
        `;
        const result = await db.query(query, [newName, id, workspaceId]);
        return result.rows[0];
    }

    static async findByDeviceId(deviceId) {
        const query = `
            SELECT id, device_id, name, device_type, status, last_seen, created_at, workspace_id 
            FROM devices WHERE device_id = $1
        `;
        const result = await db.query(query, [deviceId]);
        return result.rows[0];
    }

    static async updateStatusAndLastSeen(deviceId, status) {
        const query = `
            UPDATE devices 
            SET status = $1, last_seen = CURRENT_TIMESTAMP 
            WHERE device_id = $2
            RETURNING id, device_id, status, last_seen
        `;
        const result = await db.query(query, [status, deviceId]);
        return result.rows[0];
    }
    static async findById(id) {
        const query = `
            SELECT id, device_id, name, device_type, status, last_seen, created_at, workspace_id 
            FROM devices WHERE id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = Device;
