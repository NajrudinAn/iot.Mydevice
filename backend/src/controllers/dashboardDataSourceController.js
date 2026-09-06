const DashboardDataSource = require('../models/dashboardDataSource');
const Application = require('../models/application');
const DashboardWidget = require('../models/dashboardWidget');
const ApiDefinition = require('../models/apiDefinition');

const ALLOWED_REFRESH_INTERVALS = [5, 10, 30, 60, 300, 600];

exports.createDataSource = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { name, source_type, device_id, device_ids, api_definition_id, data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration } = req.body;

        if (!name || !source_type || !data_field || !query_mode) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (!ALLOWED_REFRESH_INTERVALS.includes(refresh_interval)) {
            return res.status(400).json({ message: 'Invalid refresh interval' });
        }

        const normalizedDeviceIds = device_ids || (device_id ? [device_id] : []);

        if (source_type === 'DEVICE_TELEMETRY') {
            if (normalizedDeviceIds.length === 0) return res.status(400).json({ message: 'Device ID(s) required for DEVICE_TELEMETRY' });
            
            // Check device ownership for each device
            for (const dId of normalizedDeviceIds) {
                const assigned = await Application.checkDeviceAssigned(application_id, dId);
                if (!assigned) {
                    return res.status(403).json({ message: `Device ${dId} is not assigned to this Application` });
                }
            }
        } else if (source_type === 'API_DEFINITION') {
            if (!api_definition_id) return res.status(400).json({ message: 'API Definition ID required for API_DEFINITION' });
            
            // Check API ownership
            const apiDef = await ApiDefinition.findById(api_definition_id);
            if (!apiDef || apiDef.application_id !== application_id) {
                return res.status(403).json({ message: 'API does not belong to this Application' });
            }
        } else {
            return res.status(400).json({ message: 'Unsupported source type' });
        }

        const source = await DashboardDataSource.create(
            application_id, name, source_type, normalizedDeviceIds, api_definition_id, 
            data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration
        );
        res.status(201).json({ source });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDataSources = async (req, res) => {
    try {
        const { application_id } = req.params;
        const sources = await DashboardDataSource.findAll(application_id);
        res.json({ sources });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateDataSource = async (req, res) => {
    try {
        const { application_id, source_id } = req.params;
        const { name, source_type, device_id, device_ids, api_definition_id, data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration } = req.body;

        const existing = await DashboardDataSource.findById(source_id);
        if (!existing || existing.application_id !== application_id) {
            return res.status(404).json({ message: 'Data source not found' });
        }

        if (!ALLOWED_REFRESH_INTERVALS.includes(refresh_interval)) {
            return res.status(400).json({ message: 'Invalid refresh interval' });
        }

        const normalizedDeviceIds = device_ids || (device_id ? [device_id] : []);

        if (source_type === 'DEVICE_TELEMETRY' && normalizedDeviceIds.length > 0) {
            for (const dId of normalizedDeviceIds) {
                const assigned = await Application.checkDeviceAssigned(application_id, dId);
                if (!assigned) return res.status(403).json({ message: `Device ${dId} is not assigned to this Application` });
            }
        }

        const updated = await DashboardDataSource.update(
            source_id, name, source_type, normalizedDeviceIds, api_definition_id, 
            data_field, query_mode, time_range, aggregation, refresh_interval, enabled, configuration
        );
        res.json({ source: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteDataSource = async (req, res) => {
    try {
        const { application_id, source_id } = req.params;
        
        const existing = await DashboardDataSource.findById(source_id);
        if (!existing || existing.application_id !== application_id) {
            return res.status(404).json({ message: 'Data source not found' });
        }

        // Detect widgets referencing it.
        // We'll search for this source_id in dashboard_widgets configuration.
        // Because configuration is JSONB, we can query it using Postgres JSONB operators,
        // but for safety, we can just let `DashboardWidget` expose a method to check if a source is used.
        // Or we can manually query here.
        const db = require('../config/db');
        const checkWidgets = await db.query(`
            SELECT dw.id, dw.title 
            FROM dashboard_widgets dw
            JOIN dashboard_pages dp ON dw.dashboard_page_id = dp.id
            JOIN dashboards d ON dp.dashboard_id = d.id
            WHERE d.application_id = $1 
              AND dw.configuration->>'data_source_id' = $2
        `, [application_id, source_id]);

        if (checkWidgets.rows.length > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete data source because it is referenced by widgets',
                widgets: checkWidgets.rows
            });
        }

        await DashboardDataSource.delete(source_id);
        res.json({ message: 'Data source deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
