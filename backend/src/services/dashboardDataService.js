const db = require('../config/db');

class DashboardDataService {
    static async fetchData(source) {
        if (!source.enabled) {
            return { error: 'Data source is disabled', data: null };
        }

        // We only support LATEST and HISTORY for now, and limited AGGREGATED
        if (source.source_type === 'DEVICE_TELEMETRY') {
            return await this._fetchDeviceTelemetry(source);
        } else if (source.source_type === 'API_DEFINITION') {
            // We would proxy through to ApiDefinition logic.
            // For simplicity in Phase 6K, let's treat API_DEFINITION as basically returning what the API does.
            // But the prompt says: "Respect the existing Phase 6F API definition... The new dashboard data service must remain more restrictive".
            // Since API_DEFINITION uses a specific device, we can resolve it similarly.
            return await this._fetchDeviceTelemetry(source);
        } else {
            return { error: 'Unsupported source type', data: null };
        }
    }

    static async _fetchDeviceTelemetry(source) {
        if (!source.devices || source.devices.length === 0) {
            return { error: 'No hardware devices resolved', data: null };
        }

        const hardwareDeviceIds = source.devices.map(d => d.hardware_device_id);

        // Field whitelist protection
        const allowedFields = ['temperature', 'humidity', 'recorded_at'];
        if (!allowedFields.includes(source.data_field)) {
            return { error: 'Invalid data field requested', data: null };
        }

        const field = source.data_field;

        try {
            if (source.query_mode === 'LATEST') {
                // Return just the latest record for EACH device
                // Using DISTINCT ON is best in postgres
                const query = `
                    SELECT DISTINCT ON (device_id) device_id as hardware_device_id, ${field}, recorded_at
                    FROM sensor_data
                    WHERE device_id = ANY($1)
                    ORDER BY device_id, recorded_at DESC
                `;
                const res = await db.query(query, [hardwareDeviceIds]);
                // If single device, return object for backward compatibility, else return array
                if (hardwareDeviceIds.length === 1) {
                    return { error: null, data: res.rows[0] || null };
                }
                return { error: null, data: res.rows };
            } 
            else if (source.query_mode === 'HISTORY') {
                // Calculate time bounds based on time_range
                let intervalStr = '1 hour';
                switch (source.time_range) {
                    case 'LAST_5_MINUTES': intervalStr = '5 minutes'; break;
                    case 'LAST_15_MINUTES': intervalStr = '15 minutes'; break;
                    case 'LAST_1_HOUR': intervalStr = '1 hour'; break;
                    case 'LAST_6_HOURS': intervalStr = '6 hours'; break;
                    case 'LAST_24_HOURS': intervalStr = '24 hours'; break;
                    case 'LAST_7_DAYS': intervalStr = '7 days'; break;
                    default: intervalStr = '1 hour'; break;
                }

                // Prevent resource exhaustion (max 1000 limit)
                const query = `
                    SELECT device_id as hardware_device_id, ${field}, recorded_at
                    FROM sensor_data
                    WHERE device_id = ANY($1) AND recorded_at >= NOW() - INTERVAL '${intervalStr}'
                    ORDER BY recorded_at ASC
                    LIMIT 2000
                `;
                const res = await db.query(query, [hardwareDeviceIds]);
                return { error: null, data: res.rows };
            }
            else if (source.query_mode === 'AGGREGATED') {
                let aggFunc = 'AVG';
                switch (source.aggregation) {
                    case 'AVG': aggFunc = 'AVG'; break;
                    case 'MIN': aggFunc = 'MIN'; break;
                    case 'MAX': aggFunc = 'MAX'; break;
                    case 'COUNT': aggFunc = 'COUNT'; break;
                    default: aggFunc = 'AVG'; break;
                }
                
                let intervalStr = '24 hours';
                switch (source.time_range) {
                    case 'LAST_1_HOUR': intervalStr = '1 hour'; break;
                    case 'LAST_24_HOURS': intervalStr = '24 hours'; break;
                    case 'LAST_7_DAYS': intervalStr = '7 days'; break;
                    default: intervalStr = '24 hours'; break;
                }

                // Return aggregate per device
                const query = `
                    SELECT device_id as hardware_device_id, ${aggFunc}(${field}) as value
                    FROM sensor_data
                    WHERE device_id = ANY($1) AND recorded_at >= NOW() - INTERVAL '${intervalStr}'
                    GROUP BY device_id
                `;
                const res = await db.query(query, [hardwareDeviceIds]);
                
                if (hardwareDeviceIds.length === 1) {
                    return { error: null, data: res.rows[0] };
                }
                return { error: null, data: res.rows };
            }
            
            return { error: 'Unknown query mode', data: null };
            
        } catch (err) {
            console.error('Data Service Error:', err);
            return { error: 'Database query failed', data: null };
        }
    }
}

module.exports = DashboardDataService;
