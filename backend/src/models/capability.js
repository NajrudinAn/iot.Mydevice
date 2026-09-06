const { pool } = require('../config/db');
const crypto = require('crypto');

class Capability {
    static generateHash(capabilitiesArray) {
        return crypto.createHash('sha256').update(JSON.stringify(capabilitiesArray)).digest('hex');
    }

    /**
     * Registers capabilities for a device. Overwrites all existing capabilities.
     * @param {string} deviceId Internal UUID of device
     * @param {string} workspaceId Internal UUID of workspace
     * @param {Array} capabilities Array of capability objects
     * @returns {boolean} True if changes were made, false if hash matched and skipped
     */
    static async registerCapabilities(deviceId, workspaceId, capabilities) {
        if (!Array.isArray(capabilities)) return false;

        const newHash = this.generateHash(capabilities);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check existing hash
            const { rows } = await client.query('SELECT capabilities_hash FROM devices WHERE id = $1', [deviceId]);
            if (rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            
            if (rows[0].capabilities_hash === newHash) {
                // No changes
                await client.query('ROLLBACK');
                return false;
            }

            // Clear old capabilities (cascade will delete actions)
            await client.query('DELETE FROM device_capabilities WHERE device_id = $1', [deviceId]);

            // Insert new capabilities
            for (const cap of capabilities) {
                if (!cap.name) continue;

                const capRes = await client.query(
                    `INSERT INTO device_capabilities (device_id, workspace_id, name, label, type, state_mapping) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [deviceId, workspaceId, cap.name, cap.label || cap.name, cap.type || 'control', cap.state ? JSON.stringify(cap.state) : null]
                );
                
                const capabilityId = capRes.rows[0].id;

                if (Array.isArray(cap.actions)) {
                    for (const action of cap.actions) {
                        if (!action.name) continue;
                        
                        await client.query(
                            `INSERT INTO device_capability_actions (capability_id, name, label, description, parameters) 
                             VALUES ($1, $2, $3, $4, $5)`,
                            [
                                capabilityId, 
                                action.name, 
                                action.label || action.name, 
                                action.description || null, 
                                action.parameters ? JSON.stringify(action.parameters) : '{}'
                            ]
                        );
                    }
                }
            }

            // Update hash
            await client.query('UPDATE devices SET capabilities_hash = $1 WHERE id = $2', [newHash, deviceId]);

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Gets all registered capabilities for a device, including actions
     * @param {string} deviceId Internal UUID
     */
    static async getByDeviceId(deviceId) {
        const query = `
            SELECT 
                c.id, c.name, c.label, c.type, c.state_mapping,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', a.id,
                            'name', a.name,
                            'label', a.label,
                            'description', a.description,
                            'parameters', a.parameters
                        )
                    ) FILTER (WHERE a.id IS NOT NULL), '[]'
                ) as actions
            FROM device_capabilities c
            LEFT JOIN device_capability_actions a ON c.id = a.capability_id
            WHERE c.device_id = $1
            GROUP BY c.id
            ORDER BY c.name
        `;
        const result = await pool.query(query, [deviceId]);
        return result.rows;
    }
}

module.exports = Capability;
