const sseEmitter = require('../services/sseEmitter');
const Device = require('../models/device');
const SensorData = require('../models/sensorData');
const DeviceDataField = require('../models/deviceDataField');

const handleData = async (topicDeviceId, payload) => {
    // 1. Validate payload basics
    if (!payload.device_id || !payload.data) {
        console.error('Invalid telemetry format: Missing device_id or data');
        return;
    }

    // 2. Prevent mismatch
    if (topicDeviceId !== payload.device_id) {
        console.error(`Device ID mismatch: topic=${topicDeviceId}, payload=${payload.device_id}`);
        return;
    }

    // 3. Verify device exists
    const device = await Device.findByDeviceId(topicDeviceId);
    if (!device) {
        console.error(`Unknown device telemetry rejected: ${topicDeviceId}`);
        return;
    }

    // Helper to flatten object for discovery
    const flattenJSON = (obj, prefix = '') => {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                Object.assign(acc, flattenJSON(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    };

    // 4. If an explicit source is provided, namespace all flat field keys with it.
    //    This allows devices to send separate per-group messages:
    //      { device_id, source: "sensor_1", data: { temperature: 22.5, humidity: 48.0 } }
    //    which becomes fields: sensor_1.temperature, sensor_1.humidity
    const explicitSource = (typeof payload.source === 'string' && payload.source.trim()) ? payload.source.trim() : null;

    const flatRaw = flattenJSON(payload.data);

    // Build the namespaced data object that will be stored & emitted
    const namespacedData = {};
    if (explicitSource) {
        for (const [k, v] of Object.entries(flatRaw)) {
            namespacedData[`${explicitSource}.${k}`] = v;
        }
    } else {
        // No explicit source — field names are used as-is (dot-prefix = source group)
        Object.assign(namespacedData, flatRaw);
    }

    // 5. Discover & sync fields
    if (Object.keys(namespacedData).length > 0) {
        const discoveredFields = {};
        for (const [key, value] of Object.entries(namespacedData)) {
            if (value === null) discoveredFields[key] = 'null';
            else if (Array.isArray(value)) discoveredFields[key] = 'array';
            else discoveredFields[key] = typeof value;
        }
        DeviceDataField.syncFields(topicDeviceId, discoveredFields).catch(err => {
            console.error('Field sync error:', err);
        });
    }

    // Helper: convert flat dot-keyed object to nested object for JSONB storage
    // e.g. { "sensor_1.temperature": 22.5 } → { "sensor_1": { "temperature": 22.5 } }
    const nestify = (flat) => {
        const nested = {};
        for (const [key, value] of Object.entries(flat)) {
            const parts = key.split('.');
            let cur = nested;
            for (let i = 0; i < parts.length - 1; i++) {
                if (cur[parts[i]] === undefined || typeof cur[parts[i]] !== 'object') {
                    cur[parts[i]] = {};
                }
                cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = value;
        }
        return nested;
    };

    // 6. Store telemetry as NESTED JSON so jsonb_extract_path works per field path
    const nestedPayload = nestify(namespacedData);
    await SensorData.insert(topicDeviceId, nestedPayload);

    // Emit live telemetry to SSE (using namespaced keys so UI groups correctly)
    if (device && device.workspace_id) {
        sseEmitter.emitTelemetry(device.workspace_id, {
            deviceId: topicDeviceId,
            timestamp: new Date().toISOString(),
            data: namespacedData
        });
    }

    // 7. Update device status and last_seen
    const updatedDevice = await Device.updateStatusAndLastSeen(topicDeviceId, 'ONLINE');
    
    if (device.status !== 'ONLINE' && updatedDevice && device.workspace_id) {
        sseEmitter.emitStatusChange(device.workspace_id, {
            deviceId: topicDeviceId,
            status: 'ONLINE',
            lastSeen: updatedDevice.last_seen
        });
    }
};


const handleStatus = async (topicDeviceId, payload) => {
    if (!payload.device_id || !payload.status) {
        console.error('Invalid status format: Missing device_id or status');
        return;
    }

    if (topicDeviceId !== payload.device_id) {
        console.error(`Device ID mismatch: topic=${topicDeviceId}, payload=${payload.device_id}`);
        return;
    }

    const status = payload.status.toUpperCase();
    if (status !== 'ONLINE' && status !== 'OFFLINE') {
        console.error(`Invalid status value: ${status}`);
        return;
    }

    // Verify device exists
    const device = await Device.findByDeviceId(topicDeviceId);
    if (!device) {
        console.error(`Unknown device status rejected: ${topicDeviceId}`);
        return;
    }

    // Update status and last_seen
    const updatedDevice = await Device.updateStatusAndLastSeen(topicDeviceId, status);
    
    // Emit SSE if status changed
    if (device.status !== status && updatedDevice && device.workspace_id) {
        sseEmitter.emitStatusChange(device.workspace_id, {
            deviceId: topicDeviceId,
            status: status,
            lastSeen: updatedDevice.last_seen
        });
    }
};

module.exports = { handleData, handleStatus };

const Command = require('../models/command');

const handleCommandAck = async (topicDeviceId, payload) => {
    // 1. Validate payload structure
    if (!payload.command_id || !payload.correlation_id || !payload.status) {
        console.error('Invalid command ack format: Missing required fields');
        return;
    }

    // 2. Resolve device
    const device = await Device.findByDeviceId(topicDeviceId);
    if (!device) {
        console.error(`Unknown device command ack rejected: ${topicDeviceId}`);
        return;
    }

    // 3. Find command
    const command = await Command.findByCorrelationId(payload.correlation_id);
    if (!command) {
        console.error(`Unknown correlation_id rejected: ${payload.correlation_id}`);
        return;
    }

    // 4. Verify command belongs to this exact device
    if (command.device_id !== device.id) {
        console.error(`Device mismatch for command ack: ${topicDeviceId} tried to ack command for ${command.device_id}`);
        return;
    }

    // 5. Verify command state is valid for ack
    if (command.status === 'COMPLETED' || command.status === 'FAILED' || command.status === 'TIMEOUT') {
        // Ignored safely as per requirements
        return;
    }

    // 6. Validate ack status
    const ackStatus = payload.status.toUpperCase();
    if (!['ACKNOWLEDGED', 'COMPLETED', 'FAILED', 'REJECTED'].includes(ackStatus)) {
        console.error(`Invalid command ack status: ${ackStatus}`);
        return;
    }

    // 7. Update command in DB
    const updates = {
        response_payload: payload.result || payload.response_payload || null
    };
    if (payload.error_code) updates.error_code = payload.error_code;
    if (payload.error_message) updates.error_message = payload.error_message;

    const updatedCommand = await Command.updateStatus(command.id, ackStatus, updates);

    // 8. Emit SSE
    sseEmitter.emitCommandStatusChange(command.workspace_id, {
        commandId: updatedCommand.id,
        deviceId: topicDeviceId,
        status: updatedCommand.status,
        errorCode: updatedCommand.error_code,
        errorMessage: updatedCommand.error_message,
        timestamp: updatedCommand.updated_at || new Date().toISOString()
    });
};

module.exports.handleCommandAck = handleCommandAck;

const Capability = require('../models/capability');

const handleCapabilities = async (topicDeviceId, payload) => {
    if (!Array.isArray(payload)) {
        console.error(`Invalid capabilities payload format for ${topicDeviceId}: Expected array`);
        return;
    }

    const device = await Device.findByDeviceId(topicDeviceId);
    if (!device) {
        console.error(`Unknown device capabilities rejected: ${topicDeviceId}`);
        return;
    }

    try {
        const changed = await Capability.registerCapabilities(device.id, device.workspace_id, payload);
        
        if (changed) {
            sseEmitter.emitCapabilityUpdate(device.workspace_id, {
                deviceId: topicDeviceId,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`Error registering capabilities for ${topicDeviceId}:`, error);
    }
};

module.exports.handleCapabilities = handleCapabilities;
