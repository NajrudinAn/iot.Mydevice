const db = require('../config/db');

class DeviceDataField {
    /**
     * Synchronizes a set of discovered fields into the registry.
     * Uses UPSERT (ON CONFLICT DO NOTHING) to handle rapid duplicate discoveries efficiently.
     * 
     * @param {string} deviceId - The device ID
     * @param {Object} discoveredFields - Key-value pair of { field_name: data_type }
     */
    static async syncFields(deviceId, discoveredFields) {
        if (!discoveredFields || Object.keys(discoveredFields).length === 0) return;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const [fieldName, dataType] of Object.entries(discoveredFields)) {
                // Determine a basic display name (e.g. "motor.speed" -> "Motor Speed")
                const displayName = fieldName
                    .split('.').pop()
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, char => char.toUpperCase());
                
                const source = fieldName.includes('.') ? fieldName.split('.')[0] : 'default';

                await client.query(`
                    INSERT INTO device_data_fields (device_id, field_name, display_name, data_type, source)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (device_id, field_name) DO NOTHING
                `, [deviceId, fieldName, displayName, dataType, source]);
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[DeviceDataField] Failed to sync fields for device ${deviceId}:`, error);
        } finally {
            client.release();
        }
    }

    static async getByDeviceId(deviceId) {
        const result = await db.query(
            'SELECT * FROM device_data_fields WHERE device_id = $1 ORDER BY source ASC, display_name ASC',
            [deviceId]
        );
        return result.rows;
    }

    static async updateField(deviceId, fieldName, updates) {
        const { display_name, unit, description, category, is_manual, source } = updates;
        
        // Ensure field exists first
        const existing = await db.query(
            'SELECT * FROM device_data_fields WHERE device_id = $1 AND field_name = $2',
            [deviceId, fieldName]
        );

        if (existing.rows.length === 0) {
            // Manual creation if it doesn't exist
            const fallbackSource = fieldName.includes('.') ? fieldName.split('.')[0] : 'default';
            const result = await db.query(`
                INSERT INTO device_data_fields (device_id, field_name, display_name, data_type, unit, description, category, is_manual, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                deviceId, 
                fieldName, 
                display_name || fieldName, 
                updates.data_type || 'string', 
                unit || null, 
                description || null, 
                category || null, 
                true,
                source || fallbackSource
            ]);
            return result.rows[0];
        }

        // Update existing
        const result = await db.query(`
            UPDATE device_data_fields
            SET display_name = COALESCE($1, display_name),
                unit = $2,
                description = COALESCE($3, description),
                category = $4,
                is_manual = COALESCE($5, is_manual),
                source = COALESCE($6, source),
                updated_at = CURRENT_TIMESTAMP
            WHERE device_id = $7 AND field_name = $8
            RETURNING *
        `, [
            display_name,
            unit,
            description,
            category,
            is_manual,
            source,
            deviceId,
            fieldName
        ]);
        
        return result.rows[0];
    }
}

module.exports = DeviceDataField;
