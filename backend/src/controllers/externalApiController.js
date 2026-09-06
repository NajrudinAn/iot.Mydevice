const db = require('../config/db');
const ApiDefinition = require('../models/apiDefinition');

exports.getTelemetryData = async (req, res) => {
    try {
        const apiDef = req.apiDefinition;
        
        // Allowed fields strictly from configuration
        const allowedFields = apiDef.allowed_fields || [];
        if (allowedFields.length === 0) {
            return res.status(403).json({ message: 'No fields configured for this API' });
        }

        // Validate query parameters
        let { limit = 50, device_id } = req.query;
        limit = parseInt(limit, 10);
        if (isNaN(limit) || limit <= 0 || limit > 100) { // Enforce max limit of 100 for external APIs
            limit = 50; 
        }

        // Build the SELECT clause securely
        const safeColumns = allowedFields.map(f => {
            // Very strict whitelist check to prevent SQL injection
            if (['device_id', 'temperature', 'humidity', 'recorded_at'].includes(f)) {
                return f;
            }
            return null;
        }).filter(Boolean).join(', ');

        if (!safeColumns) {
            return res.status(403).json({ message: 'No valid safe fields configured for this API' });
        }

        // Fetch configured devices for this API
        const devices = await ApiDefinition.getDevices(apiDef.id);
        if (devices.length === 0) {
            return res.status(403).json({ message: 'No devices assigned to this API' });
        }

        const validDeviceIds = devices.map(d => d.device_id); // The physical device IDs (e.g. DEV-xxx)

        // Device Filtering
        let targetDeviceIds = validDeviceIds;
        if (device_id) {
            if (!validDeviceIds.includes(device_id)) {
                return res.status(403).json({ message: 'Requested device is not authorized for this API' });
            }
            targetDeviceIds = [device_id];
        }

        // Query execution
        // We use ANY($1) to match against the array of target device IDs securely
        const query = `
            SELECT ${safeColumns}
            FROM sensor_data
            WHERE device_id = ANY($1)
            ORDER BY recorded_at DESC
            LIMIT $2
        `;
        
        const result = await db.query(query, [targetDeviceIds, limit]);

        res.json({
            api: apiDef.slug,
            data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error retrieving API data' });
    }
};
