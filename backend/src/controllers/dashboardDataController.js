const Dashboard = require('../models/dashboard');
const DashboardWidget = require('../models/dashboardWidget');
const DashboardDataSource = require('../models/dashboardDataSource');
const DashboardDataService = require('../services/dashboardDataService');
const Device = require('../models/device');

exports.getDashboardData = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;

        // 1. Validate Dashboard exists and belongs to Application
        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        if (dashboard.status !== 'ACTIVE') {
            return res.status(403).json({ message: 'Dashboard is disabled' });
        }

        // Dashboard Visibility & Access Control
        // Public dashboards allow anonymous access. Private dashboards require authentication.
        if (dashboard.visibility === 'PRIVATE') {
            if (!req.user || !req.user.role) {
                return res.status(401).json({ message: 'Authentication required for private dashboard' });
            }
            // Role check is inherently handled because the router middleware for private apps requires application auth,
            // but we can enforce it explicitly.
            if (req.user.role === 'PENDING') {
                return res.status(403).json({ message: 'Membership pending approval' });
            }
        }

        // 2. Fetch all widgets on this dashboard
        // We'll need a query to get widgets across all pages of the dashboard
        const db = require('../config/db');
        const widgetsQuery = await db.query(`
            SELECT dw.*
            FROM dashboard_widgets dw
            JOIN dashboard_pages dp ON dw.dashboard_page_id = dp.id
            WHERE dp.dashboard_id = $1 AND dw.enabled = true
        `, [dashboard_id]);
        
        const widgets = widgetsQuery.rows;

        // 3. Process data sources and gather telemetry
        const responseData = {
            dashboard_id: dashboard.id,
            timestamp: new Date().toISOString(),
            widgets: {}
        };

        // For efficiency, cache fetched data sources so we don't look up the same data source 10 times
        // if 10 widgets use it.
        const sourceCache = {};

        for (const widget of widgets) {
            if (!widget.configuration || !widget.configuration.data_source_id) {
                responseData.widgets[widget.id] = { status: 'ok', data: null, message: 'No data source configured' };
                continue;
            }

            const sourceId = widget.configuration.data_source_id;
            
            let source = sourceCache[sourceId];
            if (!source) {
                source = await DashboardDataSource.findById(sourceId);
                sourceCache[sourceId] = source;
            }

            if (!source || source.application_id !== application_id) {
                responseData.widgets[widget.id] = { status: 'error', data: null, message: 'Data source not found or isolated' };
                continue;
            }

            if (!source.enabled) {
                responseData.widgets[widget.id] = { status: 'error', data: null, message: 'Data source is disabled' };
                continue;
            }

            // Phase 6E Permission Enforcement
            // If the user is a VIEWER (and logged in), they might have specific device permissions.
            // If dashboard is PUBLIC and user is anonymous, they inherit the explicitly configured dashboard access.
            if (req.user && req.user.role === 'VIEWER' && source.device_id) {
                const ApplicationUser = require('../models/applicationUser');
                const hasRead = await ApplicationUser.checkDevicePermission(application_id, req.user.id, source.device_id, 'can_read');
                if (!hasRead) {
                    responseData.widgets[widget.id] = { status: 'error', data: null, message: 'Viewer lacks read permission for this device' };
                    continue;
                }
            }

            // Apply global time control override if provided
            let finalSource = source;
            if (req.query.time_range && (source.query_mode === 'HISTORY' || source.query_mode === 'AGGREGATED')) {
                finalSource = { ...source, time_range: req.query.time_range };
            }

            // Execute Query securely through DashboardDataService
            const fetchResult = await DashboardDataService.fetchData(finalSource);
            
            if (fetchResult.error) {
                responseData.widgets[widget.id] = { status: 'error', data: null, message: fetchResult.error };
            } else {
                responseData.widgets[widget.id] = { status: 'ok', data: fetchResult.data };
            }
        }

        res.json(responseData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error retrieving dashboard data' });
    }
};

exports.viewDashboard = async (req, res) => {
    try {
        const { application_id, dashboard_id } = req.params;
        const Dashboard = require('../models/dashboard');
        const DashboardPage = require('../models/dashboardPage');
        const DashboardWidget = require('../models/dashboardWidget');

        const dashboard = await Dashboard.findById(dashboard_id);
        if (!dashboard || dashboard.application_id !== application_id) {
            return res.status(404).json({ message: 'Dashboard not found' });
        }

        if (dashboard.status !== 'ACTIVE') {
            return res.status(403).json({ message: 'Dashboard is disabled' });
        }

        if (dashboard.visibility === 'PRIVATE') {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required for private dashboard' });
            }
            // If they are logged in, we must check if they are a member of this app
            const ApplicationUser = require('../models/applicationUser');
            const Workspace = require('../models/workspace');
            const Application = require('../models/application');
            
            const application = await Application.findById(application_id);
            const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, req.user.id);
            const membership = await ApplicationUser.findByUserAndApplication(application_id, req.user.id);
            
            if (!workspace && (!membership || membership.status !== 'ACTIVE')) {
                return res.status(403).json({ message: 'Unauthorized access to private dashboard' });
            }
        }

        const pages = await DashboardPage.findAll(dashboard_id);
        const pagesWithWidgets = [];

        for (const page of pages) {
            const widgets = await DashboardWidget.findAll(page.id);
            pagesWithWidgets.push({
                ...page,
                widgets: widgets.filter(w => w.enabled)
            });
        }

        res.json({
            dashboard,
            pages: pagesWithWidgets
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
