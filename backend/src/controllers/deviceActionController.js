const Application = require('../models/application');
const Device = require('../models/device');
const db = require('../config/db');
const { publishDeviceCommand } = require('../mqtt/client');

exports.sendCommand = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { device_id } = req.params;
        const { command } = req.body;

        if (!command) {
            return res.status(400).json({ message: 'Command is required' });
        }

        const device = req.device;

        // Actually publish the command via MQTT
        publishDeviceCommand(device.device_id, command);

        res.status(200).json({ message: 'Command sent successfully' });
    } catch (err) {
        if (err.message === 'Unsupported command') {
            return res.status(400).json({ message: 'Unsupported command' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTelemetry = async (req, res) => {
    try {
        const { limit = 50 } = req.query; // reasonable bounded limit

        let parsedLimit = parseInt(limit, 10);
        if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 1000) {
            parsedLimit = 50;
        }

        const device = req.device;

        // Retrieve telemetry
        const query = `
            SELECT id, temperature, humidity, recorded_at
            FROM sensor_data
            WHERE device_id = $1
            ORDER BY recorded_at DESC
            LIMIT $2
        `;
        const result = await db.query(query, [device.device_id, parsedLimit]);

        res.status(200).json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
