const Dashboard = require('../models/dashboard');
const DashboardPage = require('../models/dashboardPage');
const DashboardWidget = require('../models/dashboardWidget');
const Device = require('../models/device');
const Application = require('../models/application');
const ApiDefinition = require('../models/apiDefinition');

// ---------------- DASHBOARD CRUD ----------------

exports.createDashboard = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { name, slug, description, status, visibility } = req.body;

        if (!name || !slug) return res.status(400).json({ message: 'Name and slug required' });

        const dashboard = await Dashboard.create(application_id, name, slug, description, status, visibility, req.user.id);
        res.status(201).json({ dashboard });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'Slug already exists in this application' });
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboards = async (req, res) => {
    try {
        const { application_id } = req.params;
        const dashboards = await Dashboard.findAll(application_id);
        res.json({ dashboards });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        const dashboard = await Dashboard.findById(dashboard_id);
        
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }
        res.json({ dashboard });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateDashboard = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        const { name, description, status, visibility, slug, theme } = req.body;

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        const updated = await Dashboard.update(dashboard_id, name, description, status, visibility, slug, theme);
        res.json({ dashboard: updated });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'Slug already exists in this application' });
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteDashboard = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        
        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        await Dashboard.delete(dashboard_id);
        res.json({ message: 'Dashboard deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.reorderDashboards = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { dashboard_ids } = req.body; // Array of IDs in desired order

        if (!Array.isArray(dashboard_ids)) {
            return res.status(400).json({ message: 'dashboard_ids must be an array' });
        }

        // Verify all dashboards belong to the app before updating
        for (let i = 0; i < dashboard_ids.length; i++) {
            const dashboard = await Dashboard.findById(dashboard_ids[i]);
            if (dashboard && dashboard.application_id === application_id) {
                await Dashboard.updatePosition(dashboard_ids[i], i);
            }
        }

        res.json({ message: 'Dashboards reordered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.duplicateDashboard = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        const userId = req.user.id;

        const originalDashboard = await Dashboard.findById(dashboard_id);
        if (!originalDashboard || originalDashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        // Generate a new unique slug
        const newSlug = originalDashboard.slug + '-copy-' + Date.now().toString(36);
        const newName = originalDashboard.name + ' (Copy)';

        const newDashboard = await Dashboard.create(
            application_id, newName, newSlug, originalDashboard.description, 
            'DRAFT', originalDashboard.visibility, userId
        );
        // Copy theme
        await Dashboard.update(newDashboard.id, newDashboard.name, newDashboard.description, newDashboard.status, newDashboard.visibility, newDashboard.slug, originalDashboard.theme);

        // Fetch pages
        const pages = await DashboardPage.findAll(dashboard_id);
        for (const page of pages) {
            const newPage = await DashboardPage.create(newDashboard.id, page.name, page.slug + '-' + Date.now().toString(36), page.position);
            
            // Fetch widgets for page
            const widgets = await DashboardWidget.findAll(page.id);
            for (const widget of widgets) {
                // If the widget has configuration with data_source_id, we MUST duplicate the data source
                // "When duplicating a dashboard, create new records for... dashboard data sources. Do NOT share mutable configurations."
                let newConfig = widget.configuration ? JSON.parse(JSON.stringify(widget.configuration)) : {};

                if (newConfig.data_source_id) {
                    const DashboardDataSource = require('../models/dashboardDataSource');
                    const oldSource = await DashboardDataSource.findById(newConfig.data_source_id);
                    if (oldSource && oldSource.application_id === application_id) {
                        const newSourceName = oldSource.name + ' (Copy)';
                        // Re-create the data source for this new dashboard
                        const dIds = oldSource.devices ? oldSource.devices.map(d => d.id) : [];
                        const newSource = await DashboardDataSource.create(
                            application_id, newSourceName, oldSource.source_type, dIds, 
                            oldSource.api_definition_id, oldSource.data_field, oldSource.query_mode, 
                            oldSource.time_range, oldSource.aggregation, oldSource.refresh_interval, 
                            oldSource.enabled, oldSource.configuration
                        );
                        newConfig.data_source_id = newSource.id;
                    }
                }

                await DashboardWidget.create(
                    newPage.id, widget.widget_type, widget.title, 
                    widget.position_x, widget.position_y, widget.width, widget.height, newConfig
                );
            }
        }

        res.status(201).json({ dashboard: newDashboard });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during duplication' });
    }
};


// ---------------- PAGE CRUD ----------------

exports.createPage = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        const { name, slug, position } = req.body;

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        if (!name || !slug) return res.status(400).json({ message: 'Name and slug required' });

        const page = await DashboardPage.create(dashboard_id, name, slug, position);
        res.status(201).json({ page });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'Slug already exists in this dashboard' });
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPages = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        const pages = await DashboardPage.findAll(dashboard_id);
        res.json({ pages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePage = async (req, res) => {
    try {
        const { application_id, dashboard_id, page_id } = req.params;
        const { name, position } = req.body;

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) return res.status(404).json({ message: 'Not found' });

        const page = await DashboardPage.findById(page_id);
        if (!page || page.dashboard_id !== dashboard_id) return res.status(404).json({ message: 'Not found' });

        const updated = await DashboardPage.update(page_id, name, position);
        res.json({ page: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deletePage = async (req, res) => {
    try {
        const { application_id, dashboard_id, page_id } = req.params;
        
        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) return res.status(404).json({ message: 'Not found' });

        const page = await DashboardPage.findById(page_id);
        if (!page || page.dashboard_id !== dashboard_id) return res.status(404).json({ message: 'Not found' });

        await DashboardPage.delete(page_id);
        res.json({ message: 'Page deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


// ---------------- WIDGET CRUD ----------------

const ALLOWED_WIDGET_TYPES = ['DEVICE_STATUS', 'SENSOR_VALUE', 'SENSOR_TABLE', 'LINE_CHART', 'BAR_CHART', 'TEXT'];

exports.createWidget = async (req, res) => {
    try {
        const { application_id, dashboard_id, page_id } = req.params;
        const { widget_type, title, position_x, position_y, width, height, configuration } = req.body;

        if (!ALLOWED_WIDGET_TYPES.includes(widget_type)) {
            return res.status(400).json({ message: 'Invalid widget type' });
        }

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) return res.status(404).json({ message: 'Not found' });

        const page = await DashboardPage.findById(page_id);
        if (!page || page.dashboard_id !== dashboard_id) return res.status(404).json({ message: 'Not found' });

        // Configuration Validation (Basic Data Source Isolation Check)
        if (configuration) {
            if (configuration.source_type === 'APPLICATION_DEVICE' && configuration.device_id) {
                // Must belong to application
                const assigned = await Application.checkDeviceAssigned(application_id, configuration.device_id);
                if (!assigned) return res.status(403).json({ message: 'Unauthorized: Device is not assigned to this Application' });
            } else if (configuration.source_type === 'DYNAMIC_API' && configuration.api_id) {
                const apiDef = await ApiDefinition.findById(configuration.api_id);
                if (!apiDef || apiDef.application_id !== application_id) return res.status(403).json({ message: 'Unauthorized: API does not belong to this Application' });
            }
        }

        const widget = await DashboardWidget.create(page_id, widget_type, title, position_x, position_y, width, height, configuration);
        res.status(201).json({ widget });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getWidgets = async (req, res) => {
    try {
        const { application_id, dashboard_id, page_id } = req.params;
        const page = await DashboardPage.findById(page_id);
        // minimal check for nested sanity
        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) return res.status(404).json({ message: 'Not found' });
        if (!page || page.dashboard_id !== dashboard_id) return res.status(404).json({ message: 'Not found' });

        const widgets = await DashboardWidget.findAll(page_id);
        res.json({ widgets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateWidget = async (req, res) => {
    try {
        const { application_id, dashboard_id, page_id, widget_id } = req.params;
        const { title, position_x, position_y, width, height, configuration } = req.body;

        const widget = await DashboardWidget.findById(widget_id);
        if (!widget || widget.dashboard_page_id !== page_id) return res.status(404).json({ message: 'Not found' });

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) return res.status(404).json({ message: 'Not found' });

        // Configuration Validation (Basic Data Source Isolation Check)
        if (configuration) {
            if (configuration.source_type === 'APPLICATION_DEVICE' && configuration.device_id) {
                const assigned = await Application.checkDeviceAssigned(application_id, configuration.device_id);
                if (!assigned) return res.status(403).json({ message: 'Unauthorized: Device is not assigned to this Application' });
            } else if (configuration.source_type === 'DYNAMIC_API' && configuration.api_id) {
                const apiDef = await ApiDefinition.findById(configuration.api_id);
                if (!apiDef || apiDef.application_id !== application_id) return res.status(403).json({ message: 'Unauthorized: API does not belong to this Application' });
            }
        }

        const updated = await DashboardWidget.update(widget_id, title, position_x, position_y, width, height, configuration);
        res.json({ widget: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteWidget = async (req, res) => {
    try {
        const { application_id, dashboard_id, page_id, widget_id } = req.params;
        
        const widget = await DashboardWidget.findById(widget_id);
        if (!widget || widget.dashboard_page_id !== page_id) return res.status(404).json({ message: 'Not found' });

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) return res.status(404).json({ message: 'Not found' });

        await DashboardWidget.delete(widget_id);
        res.json({ message: 'Widget deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
