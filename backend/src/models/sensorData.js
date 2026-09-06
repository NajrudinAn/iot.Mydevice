const db = require('../config/db');

class SensorData {
    static async insert(deviceId, payload) {
        // Extract temperature and humidity if they exist to populate legacy columns
        const temperature = payload?.temperature !== undefined ? payload.temperature : null;
        const humidity = payload?.humidity !== undefined ? payload.humidity : null;
        
        const query = `
            INSERT INTO sensor_data (device_id, temperature, humidity, payload) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, device_id, temperature, humidity, payload, recorded_at
        `;
        const result = await db.query(query, [deviceId, temperature, humidity, payload]);
        return result.rows[0];
    }

    static async getWorkspaceData(workspaceId, options = {}) {
        const { deviceId, limit = 50, offset = 0, since, start, end, fields, source } = options;
        
        const queryParams = [workspaceId];
        let queryStr = `
            SELECT s.*, d.name as device_name 
            FROM sensor_data s
            JOIN devices d ON s.device_id = d.device_id
            WHERE d.workspace_id = $1
        `;

        if (deviceId && deviceId !== 'All') {
            queryParams.push(deviceId);
            queryStr += ` AND s.device_id = $${queryParams.length}`;
        }
        
        if (since) {
            queryParams.push(since);
            queryStr += ` AND s.recorded_at > $${queryParams.length}::timestamp with time zone`;
        }
        
        if (start) {
            queryParams.push(start);
            queryStr += ` AND s.recorded_at >= $${queryParams.length}::timestamp with time zone`;
        }
        
        if (end) {
            queryParams.push(end);
            queryStr += ` AND s.recorded_at <= $${queryParams.length}::timestamp with time zone`;
        }

        if (source && source !== 'All') {
            if (source !== 'default') {
                queryParams.push(source);
                queryStr += ` AND s.payload ? $${queryParams.length}`;
            } else if (options.defaultFields && options.defaultFields.length > 0) {
                const defaultConditions = options.defaultFields.map(f => {
                    queryParams.push(f);
                    return `s.payload ? $${queryParams.length}`;
                }).join(' OR ');
                queryStr += ` AND (${defaultConditions})`;
            }
        }

        if (fields && fields.length > 0) {
            // Check if ANY of the specified fields exist in the payload
            const fieldConditions = fields.map(f => {
                queryParams.push(f);
                return `s.payload ? $${queryParams.length}`;
            }).join(' OR ');
            queryStr += ` AND (${fieldConditions})`;
        }

        queryStr += ` ORDER BY s.recorded_at DESC`;
        
        if (limit) {
            queryParams.push(limit);
            queryStr += ` LIMIT $${queryParams.length}`;
        }
        
        if (offset) {
            queryParams.push(offset);
            queryStr += ` OFFSET $${queryParams.length}`;
        }

        const result = await db.query(queryStr, queryParams);
        
        // Also get total count for pagination
        const countParams = [workspaceId];
        let countQueryStr = `
            SELECT COUNT(*) as total 
            FROM sensor_data s
            JOIN devices d ON s.device_id = d.device_id
            WHERE d.workspace_id = $1
        `;
        
        if (deviceId && deviceId !== 'All') {
            countParams.push(deviceId);
            countQueryStr += ` AND s.device_id = $${countParams.length}`;
        }
        
        if (since) {
            countParams.push(since);
            countQueryStr += ` AND s.recorded_at > $${countParams.length}::timestamp with time zone`;
        }
        
        if (start) {
            countParams.push(start);
            countQueryStr += ` AND s.recorded_at >= $${countParams.length}::timestamp with time zone`;
        }
        
        if (end) {
            countParams.push(end);
            countQueryStr += ` AND s.recorded_at <= $${countParams.length}::timestamp with time zone`;
        }

        if (source && source !== 'All') {
            if (source !== 'default') {
                countParams.push(source);
                countQueryStr += ` AND s.payload ? $${countParams.length}`;
            } else if (options.defaultFields && options.defaultFields.length > 0) {
                const defaultConditions = options.defaultFields.map(f => {
                    countParams.push(f);
                    return `s.payload ? $${countParams.length}`;
                }).join(' OR ');
                countQueryStr += ` AND (${defaultConditions})`;
            }
        }

        if (fields && fields.length > 0) {
            // Apply same filter for counting
            const fieldConditions = fields.map(f => {
                countParams.push(f);
                return `s.payload ? $${countParams.length}`;
            }).join(' OR ');
            countQueryStr += ` AND (${fieldConditions})`;
        }

        const countResult = await db.query(countQueryStr, countParams);
        
        return {
            records: result.rows,
            total: parseInt(countResult.rows[0].total, 10)
        };
    }
    static async getDeviceLiveState(deviceId, fields) {
        const liveState = {};
        
        await Promise.all(fields.map(async (field) => {
            const pathArray = field.field_name.split('.');
            const queryStr = `
                SELECT jsonb_extract_path(payload, VARIADIC $2::text[]) as value, recorded_at
                FROM sensor_data
                WHERE device_id = $1 AND jsonb_extract_path(payload, VARIADIC $2::text[]) IS NOT NULL
                ORDER BY recorded_at DESC
                LIMIT 1
            `;
            const result = await db.query(queryStr, [deviceId, pathArray]);
            if (result.rows.length > 0) {
                liveState[field.field_name] = {
                    value: result.rows[0].value,
                    timestamp: result.rows[0].recorded_at
                };
            }
        }));
        
        return liveState;
    }
}

module.exports = SensorData;
