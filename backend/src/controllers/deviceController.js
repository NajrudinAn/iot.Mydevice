const sseEmitter = require('../services/sseEmitter');
const crypto = require('crypto');
const Device = require('../models/device');
const MqttProvisioner = require('../services/MqttProvisioner');

// Simple global counter for device ID prototype generation
let deviceCounter = 1;

const registerDevice = async (req, res, next) => {
    try {
        const { name, device_type } = req.body;
        const userId = req.user.id;
        let workspaceId = req.params.workspace_id; // From POST /api/workspaces/:workspace_id/devices

        if (!name || !device_type) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // If workspace_id not explicitly provided in URL, we need it. But for backward compatibility,
        // if POST /api/devices is used, we should ideally fetch the default workspace.
        // To keep it simple and backward compatible, let's look up the user's default workspace if none provided.
        if (!workspaceId) {
            const Workspace = require('../models/workspace');
            const defaultWs = await Workspace.findByOwnerId(userId);
            if (defaultWs && defaultWs.length > 0) {
                workspaceId = defaultWs[0].id;
            } else {
                return res.status(400).json({ success: false, message: 'Workspace ID required' });
            }
        } else {
            // Verify ownership
            const Workspace = require('../models/workspace');
            const ws = await Workspace.findByIdAndOwnerId(workspaceId, userId);
            if (!ws) {
                return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
            }
        }

        // Generate ID: DEV-XXX
        const deviceId = `DEV-${String(deviceCounter++).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
        // Generate secure random key
        const secretKey = crypto.randomBytes(32).toString('hex');

        const device = await Device.create(deviceId, secretKey, name, device_type, userId, workspaceId);

        try {
            await MqttProvisioner.syncDeviceCredential(device.device_id, secretKey);
        } catch (error) {
            // Rollback device creation
            await Device.deleteByIdAndUserId(device.id, userId);
            return res.status(500).json({ success: false, message: 'Failed to provision MQTT credentials' });
        }

        return res.status(201).json({
            success: true,
            message: 'Device created successfully',
            device: {
                id: device.id,
                device_id: device.device_id,
                secret_key: device.secret_key, // Only returned once upon creation
                name: device.name,
                device_type: device.device_type,
                status: device.status,
                last_seen: device.last_seen,
                workspace_id: device.workspace_id,
                created_at: device.created_at
            }
        });
    } catch (err) {
        next(err);
    }
};

const getDevices = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspace_id;
        let devices;

        if (workspaceId) {
            // Verify ownership first
            const Workspace = require('../models/workspace');
            const ws = await Workspace.findByIdAndOwnerId(workspaceId, userId);
            if (!ws) {
                return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
            }
            devices = await Device.findByWorkspaceId(workspaceId);
        } else {
            // Backward compatibility
            devices = await Device.findByUserId(userId);
        }
        
        return res.json({
            success: true,
            devices
        });
    } catch (err) {
        next(err);
    }
};

const getDeviceDetails = async (req, res, next) => {
    try {
        const { id, workspace_id } = req.params;
        const userId = req.user.id;

        // Optionally enforce workspace isolation if accessed via workspace route
        if (workspace_id) {
            const Workspace = require('../models/workspace');
            const ws = await Workspace.findByIdAndOwnerId(workspace_id, userId);
            if (!ws) {
                return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
            }
        }

        let device;
        // Check if id is a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(id)) {
            device = await Device.findByIdAndUserId(id, userId);
        } else {
            // It might be the MQTT device_id string (e.g., DEV-006-91E0)
            device = await Device.findByDeviceId(id);
            // Must verify it belongs to the user
            if (device && device.workspace_id !== workspace_id) {
                 // Check if it belongs to a workspace owned by this user
                 const Workspace = require('../models/workspace');
                 const deviceWs = await Workspace.findByIdAndOwnerId(device.workspace_id, userId);
                 if (!deviceWs) device = null;
            }
        }
        
        if (!device || (workspace_id && device.workspace_id !== workspace_id)) {
            // Return 404 so we don't leak if device exists for another user
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        return res.json({
            success: true,
            device
        });
    } catch (err) {
        // If UUID format is wrong, postgres might throw error, catch it as 404 equivalent
        if (err.code === '22P02') {
             return res.status(404).json({ success: false, message: 'Device not found' });
        }
        next(err);
    }
};

const deleteDevice = async (req, res, next) => {
    try {
        const { id, workspace_id } = req.params;
        const userId = req.user.id;
        
        // Optionally enforce workspace isolation if accessed via workspace route
        if (workspace_id) {
            const Workspace = require('../models/workspace');
            const ws = await Workspace.findByIdAndOwnerId(workspace_id, userId);
            if (!ws) {
                return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
            }
        }

        // Need device_id for mosquitto deletion
        const device = await Device.findByIdAndUserId(id, userId);
        if (!device || (workspace_id && device.workspace_id !== workspace_id)) {
             return res.status(404).json({ success: false, message: 'Device not found' });
        }

        const deleted = await Device.deleteByIdAndUserId(id, userId);
        
        if (deleted) {
            await MqttProvisioner.removeDeviceCredential(device.device_id);
        }

        return res.json({
            success: true,
            message: 'Device deleted successfully'
        });
    } catch (err) {
        if (err.code === '22P02') {
             return res.status(404).json({ success: false, message: 'Device not found' });
        }
        next(err);
    }
};


const updateDevice = async (req, res, next) => {
    try {
        const { id, workspace_id } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Device name is required' });
        }

        if (workspace_id) {
            const Workspace = require('../models/workspace');
            const ws = await Workspace.findByIdAndOwnerId(workspace_id, userId);
            if (!ws) {
                return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
            }
        }

        const device = await Device.updateName(id, workspace_id, name.trim());
        
        if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        return res.json({
            success: true,
            device
        });
    } catch (err) {
        if (err.code === '22P02') {
             return res.status(404).json({ success: false, message: 'Device not found' });
        }
        next(err);
    }
};

const streamLiveStatus = async (req, res, next) => {
    try {
        const { workspace_id } = req.params;
        const userId = req.user.id;
        
        // Authorize: Must have access to workspace
        const Workspace = require('../models/workspace');
        const ws = await Workspace.findByIdAndOwnerId(workspace_id, userId);
        if (!ws) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Set SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        // Flush headers
        res.flushHeaders();

        // If frontend requested a specific device by UUID, find its hardware device_id string
        let targetHardwareDeviceId = req.query.deviceId;
        if (targetHardwareDeviceId && targetHardwareDeviceId.length > 30) { // rudimentary UUID check
            const deviceObj = await Device.findByIdAndUserId(targetHardwareDeviceId, userId);
            if (deviceObj) {
                targetHardwareDeviceId = deviceObj.device_id;
            }
        }

        // Listen for events specific to this workspace
        const statusEventName = `workspace:${workspace_id}:status`;
        const telemetryEventName = `workspace:${workspace_id}:telemetry`;
        const commandStatusEventName = `workspace:${workspace_id}:command-status`;
        const capabilityUpdateEventName = `workspace:${workspace_id}:capability-update`;
        console.log(`[SSE Client Connected] Workspace ${workspace_id} by User ${userId}`);
        
        const statusListener = (deviceData) => {
            if (targetHardwareDeviceId && deviceData.deviceId !== targetHardwareDeviceId) {
                return; // Filter out status updates for other devices
            }
            console.log(`[SSE Pushed Status] to client:`, deviceData);
            res.write(`event: device-status\ndata: ${JSON.stringify(deviceData)}\n\n`);
        };
        
        const telemetryListener = (telemetryData) => {
            // Server-side filtering: Only send telemetry for the requested device
            if (targetHardwareDeviceId && telemetryData.deviceId !== targetHardwareDeviceId) {
                return;
            }
            
            // Server-side filtering: Only send specific source payload if requested
            if (req.query.sourceId && req.query.sourceId !== 'All' && telemetryData.data) {
                if (telemetryData.data[req.query.sourceId] !== undefined) {
                    const filteredData = {
                        deviceId: telemetryData.deviceId,
                        timestamp: telemetryData.timestamp,
                        data: { [req.query.sourceId]: telemetryData.data[req.query.sourceId] }
                    };
                    res.write(`event: device-telemetry\ndata: ${JSON.stringify(filteredData)}\n\n`);
                }
                return; // If source requested but not in this payload, drop it entirely
            }

            res.write(`event: device-telemetry\ndata: ${JSON.stringify(telemetryData)}\n\n`);
        };
        
        const commandStatusListener = (commandData) => {
            if (targetHardwareDeviceId && commandData.deviceId !== targetHardwareDeviceId) {
                return;
            }
            res.write(`event: command-status\ndata: ${JSON.stringify(commandData)}\n\n`);
        };
        
        const capabilityUpdateListener = (capabilityData) => {
            if (targetHardwareDeviceId && capabilityData.deviceId !== targetHardwareDeviceId) {
                return;
            }
            res.write(`event: capability-update\ndata: ${JSON.stringify(capabilityData)}\n\n`);
        };

        sseEmitter.on(statusEventName, statusListener);
        sseEmitter.on(telemetryEventName, telemetryListener);
        sseEmitter.on(commandStatusEventName, commandStatusListener);
        sseEmitter.on(capabilityUpdateEventName, capabilityUpdateListener);

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 15000);

        // Cleanup on client disconnect
        req.on('close', () => {
            sseEmitter.off(statusEventName, statusListener);
            sseEmitter.off(telemetryEventName, telemetryListener);
            sseEmitter.off(commandStatusEventName, commandStatusListener);
            sseEmitter.off(capabilityUpdateEventName, capabilityUpdateListener);
            clearInterval(heartbeat);
        });

    } catch (err) {
        next(err);
    }
};

const getDeviceCapabilities = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const device = await Device.findByIdAndUserId(id, userId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        const Capability = require('../models/capability');
        const capabilities = await Capability.getByDeviceId(id);

        res.json({ success: true, capabilities });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    streamLiveStatus, registerDevice, getDevices, getDeviceDetails, updateDevice, deleteDevice, getDeviceCapabilities };
