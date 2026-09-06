const db = require('../config/db');

class Workspace {
    static async create(name, ownerId) {
        const query = `
            INSERT INTO workspaces (name, owner_id)
            VALUES ($1, $2)
            RETURNING id, name, owner_id, created_at
        `;
        const result = await db.query(query, [name, ownerId]);
        return result.rows[0];
    }

    static async findByOwnerId(ownerId) {
        const query = `
            SELECT id, name, owner_id, created_at
            FROM workspaces
            WHERE owner_id = $1
            ORDER BY created_at ASC
        `;
        const result = await db.query(query, [ownerId]);
        return result.rows;
    }

    static async findByIdAndOwnerId(id, ownerId) {
        const query = `
            SELECT id, name, owner_id, created_at
            FROM workspaces
            WHERE id = $1 AND owner_id = $2
        `;
        const result = await db.query(query, [id, ownerId]);
        return result.rows[0];
    }

    static async updateName(id, ownerId, newName) {
        const query = `
            UPDATE workspaces
            SET name = $1
            WHERE id = $2 AND owner_id = $3
            RETURNING id, name, owner_id, created_at
        `;
        const result = await db.query(query, [newName, id, ownerId]);
        return result.rows[0];
    }

    static async delete(id, ownerId) {
        const query = `
            DELETE FROM workspaces
            WHERE id = $1 AND owner_id = $2
            RETURNING id
        `;
        const result = await db.query(query, [id, ownerId]);
        return result.rowCount > 0;
    }

    static async getOverviewStats(id, ownerId) {
        // Securely fetch counts and recent devices. Ensure workspace belongs to owner.
        const authQuery = `SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2`;
        const authResult = await db.query(authQuery, [id, ownerId]);
        if (authResult.rowCount === 0) return null;

        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM devices WHERE workspace_id = $1) as total_devices,
                (SELECT COUNT(*) FROM devices WHERE workspace_id = $1 AND UPPER(status) = 'ONLINE') as online_devices,
                (SELECT COUNT(*) FROM devices WHERE workspace_id = $1 AND UPPER(status) = 'OFFLINE') as offline_devices,
                (SELECT COUNT(*) FROM applications WHERE workspace_id = $1) as total_applications
        `;
        const statsResult = await db.query(statsQuery, [id]);
        
        const recentDevicesQuery = `
            SELECT id, device_id, name, status, last_seen
            FROM devices
            WHERE workspace_id = $1
            ORDER BY last_seen DESC NULLS LAST
            LIMIT 5
        `;
        const recentDevicesResult = await db.query(recentDevicesQuery, [id]);

        return {
            ...statsResult.rows[0],
            total_devices: parseInt(statsResult.rows[0].total_devices, 10),
            online_devices: parseInt(statsResult.rows[0].online_devices, 10),
            offline_devices: parseInt(statsResult.rows[0].offline_devices, 10),
            total_applications: parseInt(statsResult.rows[0].total_applications, 10),
            total_apis: 0, // APIs feature not implemented yet
            recent_devices: recentDevicesResult.rows
        };
    }
}

module.exports = Workspace;
