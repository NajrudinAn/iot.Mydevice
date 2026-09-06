const SensorData = require('../models/sensorData');
const Workspace = require('../models/workspace');
const Device = require('../models/device');
const DeviceDataField = require('../models/deviceDataField');
const { parseLimit } = require('../utils/pagination');

const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

exports.getWorkspaceData = async (req, res, next) => {
    try {
        const workspaceId = req.params.workspace_id;
        const { deviceId, limit, offset, since, start, end, fields, source } = req.query;

        // Verify the user has access to this workspace
        const workspace = await Workspace.findByIdAndOwnerId(workspaceId, req.user.id);
        if (!workspace) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let defaultFields = [];
        if (source === 'default' && deviceId && deviceId !== 'All') {
            const deviceFields = await DeviceDataField.getByDeviceId(deviceId);
            defaultFields = deviceFields.filter(f => f.source === 'default').map(f => f.field_name);
        }

        const data = await SensorData.getWorkspaceData(workspaceId, {
            deviceId,
            limit: parseLimit(limit, 50, 1000),
            offset: offset ? parseInt(offset, 10) : 0,
            since,
            start,
            end,
            fields: fields ? fields.split(',') : null,
            source,
            defaultFields
        });

        res.json(data);
    } catch (err) {
        next(err);
    }
};

exports.getDeviceDataFields = async (req, res, next) => {
    try {
        const { workspace_id, deviceId } = req.params;

        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, req.user.id);
        if (!workspace) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const device = isUUID(deviceId) ? await Device.findById(deviceId) : await Device.findByDeviceId(deviceId);
        if (!device || device.workspace_id !== workspace_id) {
            return res.status(404).json({ message: 'Device not found in workspace' });
        }

        const fields = await DeviceDataField.getByDeviceId(device.device_id);
        res.json(fields);
    } catch (err) {
        next(err);
    }
};

exports.updateDeviceDataField = async (req, res, next) => {
    try {
        const { workspace_id, deviceId, field_name } = req.params;
        const updates = req.body;

        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, req.user.id);
        if (!workspace) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const device = isUUID(deviceId) ? await Device.findById(deviceId) : await Device.findByDeviceId(deviceId);
        if (!device || device.workspace_id !== workspace_id) {
            return res.status(404).json({ message: 'Device not found in workspace' });
        }

        const updatedField = await DeviceDataField.updateField(device.device_id, field_name, updates);
        res.json(updatedField);
    } catch (err) {
        next(err);
    }
};

exports.getDeviceLiveState = async (req, res, next) => {
    try {
        const { workspace_id, deviceId } = req.params;
        const { source } = req.query;

        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, req.user.id);
        if (!workspace) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const device = isUUID(deviceId) ? await Device.findById(deviceId) : await Device.findByDeviceId(deviceId);
        if (!device || device.workspace_id !== workspace_id) {
            return res.status(404).json({ message: 'Device not found in workspace' });
        }

        let fields = await DeviceDataField.getByDeviceId(device.device_id);
        
        if (source && source !== 'All') {
            fields = fields.filter(f => f.source === source);
        }

        const liveState = await SensorData.getDeviceLiveState(device.device_id, fields);
        
        res.json(liveState);
    } catch (err) {
        next(err);
    }
};
