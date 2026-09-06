const { v4: uuidv4 } = require('uuid');
const Command = require('../models/command');
const Device = require('../models/device');
const Workspace = require('../models/workspace');
const { getMqttClient } = require('../mqtt/client');
const sseEmitter = require('../services/sseEmitter');
const { parseLimit, parsePage } = require('../utils/pagination');



const executeCommand = async (device, workspaceId, userId, applicationId, type, payload) => {
    const Capability = require('../models/capability');
    const capabilities = await Capability.getByDeviceId(device.id);

    let validAction = null;
    for (const cap of capabilities) {
        const match = cap.actions.find(a => a.name === type);
        if (match) {
            validAction = match;
            break;
        }
    }

    if (!validAction) {
        throw { status: 400, error_code: 'INVALID_COMMAND', message: 'Command type not supported by this device' };
    }
    
    // Basic parameter validation based on schema
    const schema = validAction.parameters || {};
    const providedPayload = payload || {};
    
    for (const [key, rules] of Object.entries(schema)) {
        if (rules.required && providedPayload[key] === undefined) {
            throw { status: 400, error_code: 'MISSING_PARAMETER', message: `Missing required parameter: ${key}` };
        }
        if (providedPayload[key] !== undefined) {
            if (rules.type === 'number' && typeof providedPayload[key] !== 'number') {
                throw { status: 400, error_code: 'INVALID_PARAMETER', message: `Parameter ${key} must be a number` };
            }
            if (rules.min !== undefined && providedPayload[key] < rules.min) {
                throw { status: 400, error_code: 'INVALID_PARAMETER', message: `Parameter ${key} is below minimum of ${rules.min}` };
            }
            if (rules.max !== undefined && providedPayload[key] > rules.max) {
                throw { status: 400, error_code: 'INVALID_PARAMETER', message: `Parameter ${key} is above maximum of ${rules.max}` };
            }
        }
    }

    if (device.status !== 'ONLINE') {
        throw { status: 400, error_code: 'DEVICE_OFFLINE', message: 'Cannot send command. Device is currently offline.' };
    }

    const correlationId = uuidv4();
    
    // 1. Create PENDING command in DB
    let commandRecord = await Command.create({
        workspace_id: workspaceId,
        application_id: applicationId,
        device_id: device.id,
        requested_by_user_id: userId,
        command_type: type,
        command_payload: payload || {},
        correlation_id: correlationId
    });

    // 2. Publish to MQTT
    const mqttClient = getMqttClient();
    if (!mqttClient || !mqttClient.connected) {
        commandRecord = await Command.updateStatus(commandRecord.id, 'FAILED', { 
            error_code: 'MQTT_DISCONNECTED', 
            error_message: 'MQTT Broker is currently disconnected' 
        });
        throw { status: 500, message: 'MQTT Broker disconnected', command: commandRecord };
    }

    const envelope = {
        command_id: commandRecord.id,
        correlation_id: correlationId,
        type: type,
        payload: payload || {},
        timestamp: new Date().toISOString()
    };
    
    const topic = `devices/${device.device_id}/command`;

    mqttClient.publish(topic, JSON.stringify(envelope), { qos: 1 }, async (err) => {
        if (err) {
            console.error('MQTT Publish Error:', err);
            commandRecord = await Command.updateStatus(commandRecord.id, 'FAILED', {
                error_code: 'MQTT_PUBLISH_FAILED',
                error_message: err.message
            });
            sseEmitter.emitCommandStatusChange(workspaceId, {
                commandId: commandRecord.id,
                deviceId: device.device_id,
                status: 'FAILED',
                errorCode: 'MQTT_PUBLISH_FAILED',
                errorMessage: err.message,
                timestamp: commandRecord.failed_at
            });
        } else {
            commandRecord = await Command.updateStatus(commandRecord.id, 'SENT');
            sseEmitter.emitCommandStatusChange(workspaceId, {
                commandId: commandRecord.id,
                deviceId: device.device_id,
                status: 'SENT',
                timestamp: commandRecord.sent_at
            });
        }
    });

    return {
        id: commandRecord.id,
        correlation_id: correlationId,
        status: commandRecord.status,
        type: commandRecord.command_type
    };
};

const sendCommand = async (req, res) => {
    try {
        const userId = req.user.id;
        let device = req.device; // from requireDevicePermission if via app
        let workspaceId = req.params.workspace_id || req.params.workspaceId;
        const applicationId = req.application?.id || null;
        
        // If coming from workspace route, req.device is not set, we must authorize workspace ownership
        if (!device && workspaceId) {
            const ws = await Workspace.findByIdAndOwnerId(workspaceId, userId);
            if (!ws) {
                return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
            }
            
            const deviceIdParam = req.params.deviceId || req.params.device_id || req.params.id;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(deviceIdParam)) {
                device = await Device.findByIdAndUserId(deviceIdParam, userId);
            } else {
                device = await Device.findByDeviceId(deviceIdParam);
                if (device && device.workspace_id !== workspaceId) {
                    device = null; // not in this workspace
                }
            }
            
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found in this workspace' });
            }
        }
        
        if (!device) {
            return res.status(403).json({ success: false, message: 'Forbidden: Device access denied' });
        }
        
        // Ensure workspaceId is set from the device if not explicitly in params
        if (!workspaceId) workspaceId = device.workspace_id;

        const { type, payload } = req.body;
        
        try {
            const command = await executeCommand(device, workspaceId, userId, applicationId, type, payload);
            res.status(202).json({
                success: true,
                message: 'Command accepted and pending transmission',
                command
            });
        } catch (err) {
            if (err.status) {
                return res.status(err.status).json({ success: false, ...err });
            }
            throw err;
        }

    } catch (err) {
        console.error('Error sending command:', err);
        res.status(500).json({ success: false, message: 'Server error while sending command' });
    }
};

const getDeviceCommands = async (req, res) => {
    try {
        const workspaceId = req.params.workspace_id || req.params.workspaceId;
        const deviceIdParam = req.params.deviceId || req.params.device_id || req.params.id;
        const userId = req.user.id;
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit, 20, 1000);

        // Verify workspace ownership if from workspace route
        const ws = await Workspace.findByIdAndOwnerId(workspaceId, userId);
        if (!ws) {
             return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
        }
        
        let device;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(deviceIdParam)) {
            device = await Device.findByIdAndUserId(deviceIdParam, userId);
        } else {
            device = await Device.findByDeviceId(deviceIdParam);
            if (device && device.workspace_id !== workspaceId) {
                device = null;
            }
        }

        if (!device) {
             return res.status(404).json({ success: false, message: 'Device not found in this workspace' });
        }

        const result = await Command.getDeviceCommands(workspaceId, device.id, page, limit);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Error fetching device commands:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getWorkspaceCommands = async (req, res) => {
    try {
        const workspaceId = req.params.workspace_id || req.params.workspaceId;
        const userId = req.user.id;
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit, 50, 1000);

        const ws = await Workspace.findByIdAndOwnerId(workspaceId, userId);
        if (!ws) {
             return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
        }

        const result = await Command.getWorkspaceCommands(workspaceId, page, limit);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Error fetching workspace commands:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    sendCommand,
    executeCommand,
    getDeviceCommands,
    getWorkspaceCommands
};
