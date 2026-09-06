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

    // 4. Discover fields safely (does not block telemetry storage)
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        const flatPayload = flattenJSON(payload.data);
        const discoveredFields = {};
        for (const [key, value] of Object.entries(flatPayload)) {
            if (value === null) discoveredFields[key] = 'null';
            else if (Array.isArray(value)) discoveredFields[key] = 'array';
            else discoveredFields[key] = typeof value; // string, number, boolean
        }
        
        // Sync asynchronously, do not await it blocking the main MQTT flow
        DeviceDataField.syncFields(topicDeviceId, discoveredFields).catch(err => {
            console.error('Field sync error:', err);
        });
    }

    // 5. Store telemetry with the raw payload
    await SensorData.insert(topicDeviceId, payload.data);

    // Emit live telemetry to SSE
    if (device && device.workspace_id) {
        sseEmitter.emitTelemetry(device.workspace_id, {
            deviceId: topicDeviceId,
            timestamp: new Date().toISOString(),
            data: payload.data
        });
    }

    // 6. Update device status and last_seen
    const updatedDevice = await Device.updateStatusAndLastSeen(topicDeviceId, 'ONLINE');
    
    // Emit SSE if status changed from something else to ONLINE
    if (device.status !== 'ONLINE' && updatedDevice && device.workspace_id) {
        sseEmitter.emitStatusChange(device.workspace_id, {
            deviceId: topicDeviceId,
            status: 'ONLINE',
            lastSeen: updatedDevice.last_seen
        });
    }
    
    // console.log(`Telemetry processed for ${topicDeviceId}`); // debug
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
