const { pool } = require('../config/db');
const Device = require('../models/device');
const { parseLimit, parsePage } = require('../utils/pagination');
const commandController = require('./commandController');

// Helper to filter nested JSON objects based on allowed paths (e.g., "air_quality.aqi")
const filterPayload = (payload, allowedPaths) => {
    if (!allowedPaths || allowedPaths.length === 0) return {};
    
    const result = {};
    for (const path of allowedPaths) {
        const parts = path.split('.');
        let current = payload;
        let valid = true;
        
        for (const part of parts) {
            if (current && current.hasOwnProperty(part)) {
                current = current[part];
            } else {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            // Reconstruct the nested structure in the result
            let target = result;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!target[parts[i]]) target[parts[i]] = {};
                target = target[parts[i]];
            }
            target[parts[parts.length - 1]] = current;
        }
    }
    return result;
};

// If no fields are provided in the route DB configuration, it is meant to return all data.
const filterPayloadWithFallback = (payload, allowedPaths, globalAllowed) => {
    if (globalAllowed) return payload;
    if (!allowedPaths || allowedPaths.length === 0) return {};
    return filterPayload(payload, allowedPaths);
};

exports.handleExecution = async (req, res) => {
    const { route, allowedDevices, allowedDataFields, allowedCommands, workspaceId, appUserId, userId } = req.apiContext;

    try {
        switch (route.purpose) {
            case 'CURRENT_DATA':
                return await handleCurrentData(req, res, allowedDevices, allowedDataFields, workspaceId);
            case 'HISTORY':
                return await handleHistory(req, res, allowedDevices, allowedDataFields, workspaceId);
            case 'DEVICE_STATUS':
                return await handleDeviceStatus(req, res, allowedDevices, workspaceId);
            case 'COMMAND':
                return await handleCommand(req, res, allowedDevices, allowedCommands, workspaceId, appUserId, userId);
            case 'REALTIME':
                return await handleRealtime(req, res, allowedDevices, allowedDataFields, workspaceId);
            default:
                return res.status(400).json({ success: false, message: 'Unknown route purpose' });
        }
    } catch (err) {
        console.error('API Execution Error:', err);
        return res.status(500).json({ success: false, message: 'API Execution failed' });
    }
};

async function handleCurrentData(req, res, allowedDevices, allowedDataFields, workspaceId) {
    if (allowedDevices.length === 0) {
        return res.json({ success: true, data: [] });
    }

    // Determine if specific device requested via query or body
    let targetDevices = allowedDevices;
    if (req.query.device_id) {
        if (!allowedDevices.includes(req.query.device_id)) {
            return res.status(403).json({ success: false, message: 'Access denied for this device' });
        }
        targetDevices = [req.query.device_id];
    }

    const result = await pool.query(`
        SELECT sd.device_id as hardware_id, sd.payload, sd.recorded_at, d.id as device_uuid 
        FROM devices d
        JOIN (
            SELECT device_id, payload, recorded_at,
                   ROW_NUMBER() OVER(PARTITION BY device_id ORDER BY recorded_at DESC) as rn
            FROM sensor_data
        ) sd ON sd.device_id = d.device_id
        WHERE d.id = ANY($1) AND sd.rn = 1
    `, [targetDevices]);

    const globalAllowed = allowedDataFields.length === 0;

    const data = result.rows.map(row => {
        const deviceFields = globalAllowed ? [] : allowedDataFields
            .filter(f => f.startsWith(`${row.device_uuid}::`) || !f.includes('::'))
            .map(f => f.includes('::') ? f.split('::')[1] : f);

        return {
            device_id: row.device_uuid,
            recorded_at: row.recorded_at,
            payload: filterPayloadWithFallback(row.payload, deviceFields, globalAllowed)
        };
    });

    res.json({ success: true, data });
}

async function handleHistory(req, res, allowedDevices, allowedDataFields, workspaceId) {
    if (allowedDevices.length === 0) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseLimit(req.query.limit, 500, 1000) } });
    }

    let targetDevices = allowedDevices;
    if (req.query.device_id) {
        if (!allowedDevices.includes(req.query.device_id)) {
            return res.status(403).json({ success: false, message: 'Access denied for this device' });
        }
        targetDevices = [req.query.device_id];
    }

    const limit = parseLimit(req.query.limit, 500, 1000);
    const page = parsePage(req.query.page);
    const offset = (page - 1) * limit;

    let queryParams = [targetDevices, limit, offset];
    let whereClause = `d.id = ANY($1)`;
    let paramIndex = 4;

    if (req.query.start_date) {
        whereClause += ` AND sd.recorded_at >= $${paramIndex}`;
        queryParams.push(new Date(req.query.start_date));
        paramIndex++;
    }

    if (req.query.end_date) {
        whereClause += ` AND sd.recorded_at <= $${paramIndex}`;
        queryParams.push(new Date(req.query.end_date));
        paramIndex++;
    }

    // To cleanly build count query params:
    const countParams = [targetDevices];
    let countWhere = `d.id = ANY($1)`;
    let cpIndex = 2;
    if (req.query.start_date) {
        countWhere += ` AND sd.recorded_at >= $${cpIndex++}`;
        countParams.push(new Date(req.query.start_date));
    }
    if (req.query.end_date) {
        countWhere += ` AND sd.recorded_at <= $${cpIndex++}`;
        countParams.push(new Date(req.query.end_date));
    }

    const totalCountRes = await pool.query(`
        SELECT COUNT(*) as total
        FROM sensor_data sd
        JOIN devices d ON d.device_id = sd.device_id
        WHERE ${countWhere}
    `, countParams);
    
    const totalCount = parseInt(totalCountRes.rows[0].total);

    const result = await pool.query(`
        SELECT sd.device_id as hardware_id, sd.payload, sd.recorded_at, d.id as device_uuid
        FROM sensor_data sd
        JOIN devices d ON d.device_id = sd.device_id
        WHERE ${whereClause}
        ORDER BY sd.recorded_at DESC
        LIMIT $2 OFFSET $3
    `, queryParams);

    const globalAllowed = allowedDataFields.length === 0;

    const data = result.rows.map(row => {
        const deviceFields = globalAllowed ? [] : allowedDataFields
            .filter(f => f.startsWith(`${row.device_uuid}::`) || !f.includes('::'))
            .map(f => f.includes('::') ? f.split('::')[1] : f);

        return {
            device_id: row.device_uuid,
            recorded_at: row.recorded_at,
            payload: filterPayloadWithFallback(row.payload, deviceFields, globalAllowed)
        };
    });

    res.json({ 
        success: true, 
        data,
        pagination: {
            total: totalCount,
            page,
            limit,
            total_pages: Math.ceil(totalCount / limit)
        }
    });
}

async function handleDeviceStatus(req, res, allowedDevices, workspaceId) {
    if (allowedDevices.length === 0) {
        return res.json({ success: true, devices: [] });
    }

    const result = await pool.query(`
        SELECT id, device_id, name, status, last_seen 
        FROM devices 
        WHERE id = ANY($1)
    `, [allowedDevices]);

    res.json({ success: true, devices: result.rows });
}

async function handleCommand(req, res, allowedDevices, allowedCommands, workspaceId, appUserId, userId) {
    if (req.isSchemaRequest) {
        if (req.query.command_id) {
            const cmdRes = await pool.query(
                `SELECT id, device_id, command_type, status, created_at, sent_at, acknowledged_at, completed_at, failed_at, error_message, response_payload 
                 FROM device_commands 
                 WHERE id = $1 AND workspace_id = $2`, 
                [req.query.command_id, workspaceId]
            );
            
            if (cmdRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Command not found' });
            }

            const cmd = cmdRes.rows[0];
            if (!allowedDevices.includes(cmd.device_id)) {
                return res.status(403).json({ success: false, message: 'Access denied to this command status via this route' });
            }

            return res.json({ success: true, command: cmd });
        }

        const capRes = await pool.query(
            `SELECT DISTINCT a.name, a.parameters
             FROM device_capability_actions a
             JOIN device_capabilities c ON a.capability_id = c.id
             WHERE c.device_id = ANY($1)`,
            [allowedDevices]
        );
        
        const supportedCommands = {};
        for (const row of capRes.rows) {
            supportedCommands[row.name] = row.parameters || {};
        }

        return res.json({
            success: true,
            description: "Command Route Schema Discovery",
            method: "POST",
            required_body: {
                device_id: allowedDevices.length === 1 ? `<optional> Defaults to ${allowedDevices[0]}` : "<device_uuid_string> Required",
                type: "<string> Required (see allowed_commands and device_supported_commands)",
                payload: "<object> Command-specific parameters"
            },
            api_allowed_devices: allowedDevices,
            api_allowed_commands: allowedCommands.length === 0 ? "ALL_COMMANDS_PERMITTED_BY_ROUTE" : allowedCommands,
            device_supported_commands: Object.keys(supportedCommands).length > 0 ? supportedCommands : "NO_COMMANDS_CONFIGURED_ON_DEVICE"
        });
    }

    let { device_id, type, payload } = req.body;

    if (!type) {
        return res.status(400).json({ success: false, message: 'Missing command type in request body' });
    }

    if (!device_id) {
        if (allowedDevices.length === 1) {
            device_id = allowedDevices[0];
        } else {
            return res.status(400).json({ success: false, message: 'Missing device_id in request body (required because multiple devices are authorized)' });
        }
    }

    if (!allowedDevices.includes(device_id)) {
        return res.status(403).json({ success: false, message: 'Access denied for this device via API' });
    }

    const globalAllowed = allowedCommands.length === 0;
    const isCommandAllowed = globalAllowed || allowedCommands.includes(type) || allowedCommands.includes(`${device_id}::${type}`);

    if (!isCommandAllowed) {
        return res.status(403).json({ success: false, message: 'Command type not allowed for this route' });
    }

    const device = await Device.findById(device_id);
    if (!device || device.workspace_id !== workspaceId) {
        return res.status(404).json({ success: false, message: 'Device not found' });
    }

    try {
        let executeUserId = userId;
        if (!executeUserId) {
            const ownerRes = await pool.query('SELECT owner_id FROM workspaces WHERE id = $1', [workspaceId]);
            if (ownerRes.rows.length > 0) {
                executeUserId = ownerRes.rows[0].owner_id;
            }
        }

        const commandResult = await commandController.executeCommand(
            device, 
            workspaceId, 
            executeUserId,
            null, // applicationId (we could pass app.id but executeCommand handles it)
            type, 
            payload
        );
        return res.status(202).json({ success: true, message: 'Command sent', command: commandResult });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, ...err });
        }
        throw err;
    }
}

async function handleRealtime(req, res, allowedDevices, allowedDataFields, workspaceId) {
    // Setup headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // allowedDevices currently contains UUIDs (from devices.id). 
    // We need to map them to hardware device_id strings since MQTT/SSE uses those.
    let hardwareAllowedDevices = [];
    const hardwareToUuidMap = {};
    if (allowedDevices.length > 0) {
        const devRes = await pool.query('SELECT id, device_id FROM devices WHERE id = ANY($1)', [allowedDevices]);
        hardwareAllowedDevices = devRes.rows.map(r => r.device_id);
        devRes.rows.forEach(r => {
            hardwareToUuidMap[r.device_id] = r.id;
        });
    }

    const globalAllowed = allowedDataFields.length === 0;
    const sseEmitter = require('../services/sseEmitter');
    
    // Determine allowed events from req.apiContext.allowedCommands
    // They are stored as 'REALTIME::telemetry', etc., or '*' for global
    const allowedCommands = req.apiContext.allowedCommands || [];
    const isGlobalCommands = allowedCommands === 'ALL_COMMANDS_PERMITTED_BY_ROUTE';
    const allowTelemetry = isGlobalCommands || allowedCommands.includes('REALTIME::telemetry');
    const allowDeviceStatus = isGlobalCommands || allowedCommands.includes('REALTIME::device_status');
    const allowCommandStatus = isGlobalCommands || allowedCommands.includes('REALTIME::command_status');

    const statusEventName = `workspace:${workspaceId}:status`;
    const telemetryEventName = `workspace:${workspaceId}:telemetry`;
    const commandStatusEventName = `workspace:${workspaceId}:command-status`;

    const statusListener = (deviceData) => {
        if (allowDeviceStatus && hardwareAllowedDevices.includes(deviceData.deviceId)) {
            res.write(`event: device_status\ndata: ${JSON.stringify(deviceData)}\n\n`);
        }
    };

    const telemetryListener = (telemetryData) => {
        if (allowTelemetry && hardwareAllowedDevices.includes(telemetryData.deviceId)) {
            const deviceUuid = hardwareToUuidMap[telemetryData.deviceId];
            
            const deviceFields = globalAllowed ? [] : allowedDataFields
                .filter(f => f.startsWith(`${deviceUuid}::`) || !f.includes('::'))
                .map(f => f.includes('::') ? f.split('::')[1] : f);
                
            const filtered = filterPayloadWithFallback(telemetryData.data, deviceFields, globalAllowed);
            
            if (globalAllowed || Object.keys(filtered).length > 0) {
                res.write(`event: device_data\ndata: ${JSON.stringify({...telemetryData, payload: filtered, data: undefined})}\n\n`);
            }
        }
    };

    const commandStatusListener = (commandData) => {
        if (allowCommandStatus && hardwareAllowedDevices.includes(commandData.deviceId)) {
            res.write(`event: command_status\ndata: ${JSON.stringify(commandData)}\n\n`);
        }
    };

    if (allowDeviceStatus) sseEmitter.on(statusEventName, statusListener);
    if (allowTelemetry) sseEmitter.on(telemetryEventName, telemetryListener);
    if (allowCommandStatus) sseEmitter.on(commandStatusEventName, commandStatusListener);

    req.on('close', () => {
        if (allowDeviceStatus) sseEmitter.off(statusEventName, statusListener);
        if (allowTelemetry) sseEmitter.off(telemetryEventName, telemetryListener);
        if (allowCommandStatus) sseEmitter.off(commandStatusEventName, commandStatusListener);
    });
}
