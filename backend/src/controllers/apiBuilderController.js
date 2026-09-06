const ApiDefinition = require('../models/apiDefinition');
const ApiKey = require('../models/apiKey');
const Application = require('../models/application');
const Device = require('../models/device');

exports.createApi = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { name, slug, description, authentication_required } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ message: 'Name and slug are required' });
        }

        const apiDef = await ApiDefinition.create(applicationId, name, slug, description, authentication_required ?? true);
        res.status(201).json({ api: apiDef });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Slug already exists in this application' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error creating API' });
    }
};

exports.assignDevice = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { api_id, device_id } = req.params;

        const apiDef = await ApiDefinition.findById(api_id);
        if (!apiDef || apiDef.application_id !== applicationId) {
            return res.status(404).json({ message: 'API definition not found' });
        }

        // Verify device is assigned to application
        const device = await Device.findByDeviceId(device_id) || await Device.findById(device_id);
        if (!device) return res.status(404).json({ message: 'Device not found' });

        const isAppAssigned = await Application.checkDeviceAssigned(applicationId, device.id);
        if (!isAppAssigned) return res.status(403).json({ message: 'Device is not assigned to this application' });

        await ApiDefinition.addDevice(api_id, device.id);
        res.status(200).json({ message: 'Device assigned to API successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.configureFields = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { api_id } = req.params;
        const { fields } = req.body;

        if (!Array.isArray(fields)) {
            return res.status(400).json({ message: 'Fields must be an array' });
        }

        const apiDef = await ApiDefinition.findById(api_id);
        if (!apiDef || apiDef.application_id !== applicationId) {
            return res.status(404).json({ message: 'API definition not found' });
        }

        // Whitelist validation
        const allowedWhitelist = ['device_id', 'temperature', 'humidity', 'recorded_at'];
        const invalidFields = fields.filter(f => !allowedWhitelist.includes(f));
        if (invalidFields.length > 0) {
            return res.status(400).json({ message: 'Invalid fields detected', invalidFields });
        }

        const updated = await ApiDefinition.updateFields(api_id, fields);
        res.status(200).json({ api: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createApiKey = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { api_id } = req.params;
        const { name, expires_in_days } = req.body;

        const apiDef = await ApiDefinition.findById(api_id);
        if (!apiDef || apiDef.application_id !== applicationId) {
            return res.status(404).json({ message: 'API definition not found' });
        }

        if (!name) return res.status(400).json({ message: 'Key name is required' });

        const keyData = await ApiKey.create(api_id, name, expires_in_days);
        
        res.status(201).json({
            message: 'API Key created successfully. Store this key now, it will not be shown again.',
            key_record: keyData.record,
            raw_api_key: keyData.rawKey
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteApiKey = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { api_id, key_id } = req.params;

        const apiDef = await ApiDefinition.findById(api_id);
        if (!apiDef || apiDef.application_id !== applicationId) {
            return res.status(404).json({ message: 'API definition not found' });
        }

        const deleted = await ApiKey.delete(key_id, api_id);
        if (!deleted) return res.status(404).json({ message: 'API key not found' });

        res.status(200).json({ message: 'API key deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.listApis = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const pool = require('../config/db');
        const result = await pool.query('SELECT * FROM api_definitions WHERE application_id = $1', [applicationId]);
        res.json({ apis: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.listApiKeys = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { api_id } = req.params;

        const apiDef = await ApiDefinition.findById(api_id);
        if (!apiDef || apiDef.application_id !== applicationId) {
            return res.status(404).json({ message: 'API definition not found' });
        }

        const pool = require('../config/db');
        const result = await pool.query('SELECT id, api_id, name, key_prefix, status, expires_at, created_at, last_used_at FROM api_keys WHERE api_id = $1', [api_id]);
        res.json({ keys: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
