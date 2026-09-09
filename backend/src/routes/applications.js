const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const applicationUserController = require('../controllers/applicationUserController');
const devicePermissionController = require('../controllers/devicePermissionController');
const deviceActionController = require('../controllers/deviceActionController');
const commandController = require('../controllers/commandController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireApplicationRole } = require('../middleware/applicationAuth');
const applicationAuthController = require('../controllers/applicationAuthController');

// Public auth endpoints
const rateLimit = require('express-rate-limit');
const authLimiter = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50,
    message: { success: false, message: 'Too many authentication attempts from this IP, please try again later' }
});

router.post('/:id/auth/login', authLimiter, applicationAuthController.login);
router.post('/:id/auth/register', authLimiter, applicationAuthController.register);
router.post('/:id/auth/forgot-password', authLimiter, applicationAuthController.forgotPassword);
router.post('/:id/auth/reset-password', authLimiter, applicationAuthController.resetPassword);
router.get('/:id/auth/settings', applicationAuthController.getSettings);

// Public app slug resolution
router.get('/slug-availability', applicationController.checkSlugAvailability);
router.get('/slug/:slug', applicationController.getApplicationBySlug);
router.get('/resolve-host', applicationController.resolveHost);

const dashboardDataController = require('../controllers/dashboardDataController');

// 4. Secure Data Viewer (Public vs Private handled internally)
router.get('/:application_id/dashboards/:dashboard_id/view', (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        // Run standard auth middleware to attach req.user if a token is provided
        const authMiddleware = require('../middleware/authMiddleware');
        authMiddleware(req, res, (err) => {
            if (err) return next(err);
            next();
        });
    } else {
        // No token, proceed anonymously
        next();
    }
}, dashboardDataController.viewDashboard);

// All subsequent routes require authentication
router.use(authMiddleware);

// Protected auth endpoints
router.get('/:id/auth/me', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), applicationAuthController.getMe);
router.post('/:id/auth/logout', applicationAuthController.logout);
router.post('/:id/auth/request-access', applicationAuthController.requestAccess);
router.post('/:id/auth/sso', applicationAuthController.sso);
router.patch('/:id/auth/settings', requireApplicationRole(['ADMIN']), applicationAuthController.updateSettings);

// --- Routes mounted under /api/applications ---
router.get('/:id', applicationController.getApplicationDetails);
router.patch('/:id', applicationController.updateApplication);
router.patch('/:id/retention', requireApplicationRole(['ADMIN']), applicationController.updateApplicationRetention);
router.put('/:id/branding', applicationController.updateApplicationBranding);
router.post('/:id/credentials/regenerate', requireApplicationRole(['ADMIN']), applicationController.regenerateApiCredentials);
router.delete('/:id', applicationController.deleteApplication);

// Device associations
router.post('/:id/devices', requireApplicationRole(['ADMIN']), applicationController.assignDeviceToApplication);
router.post('/:id/devices/register', requireApplicationRole(['ADMIN']), applicationController.registerAndAssignDevice);
router.get('/:id/devices', applicationController.getApplicationDevices);
router.delete('/:id/devices/:device_id', applicationController.removeDeviceFromApplication);

// Application Users
router.post('/:id/users', requireApplicationRole(['ADMIN']), applicationUserController.addUser);
router.get('/:id/users', requireApplicationRole(['ADMIN']), applicationUserController.listUsers);
router.patch('/:id/users/:user_id', requireApplicationRole(['ADMIN']), applicationUserController.updateUser);
router.delete('/:id/users/:user_id', requireApplicationRole(['ADMIN']), applicationUserController.removeUser);

// Device Actions (Command and Telemetry)
const { requireDevicePermission } = require('../middleware/devicePermission');


// Because requireDevicePermission internally checks requireApplicationRole's populated fields,
// we must first run requireApplicationRole so req.applicationMembership is populated.
// Wait, requireDevicePermission expects requireApplicationRole to run first?
// Let's use a dummy requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']) first!
router.post('/:id/devices/:device_id/commands', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), requireDevicePermission('EXECUTE_COMMAND'), commandController.sendCommand);
router.get('/:id/devices/:device_id/commands', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), requireDevicePermission('VIEW_DEVICE'), commandController.getDeviceCommands);
router.get('/:id/devices/:device_id/data', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), requireDevicePermission('READ_DATA'), deviceActionController.getTelemetry);

// Device Permissions management
router.get('/:id/permissions', requireApplicationRole(['ADMIN']), devicePermissionController.listApplicationPermissions);
router.patch('/:id/devices/:device_id/permissions', requireApplicationRole(['ADMIN']), requireDevicePermission('MANAGE_DEVICES'), devicePermissionController.updatePermissions);

// Dynamic API Builder (Phase 6F)
const apiBuilderController = require('../controllers/apiBuilderController');

// Create / List API Definition
router.post('/:id/apis', requireApplicationRole(['ADMIN']), apiBuilderController.createApi);
router.get('/:id/apis', requireApplicationRole(['ADMIN']), apiBuilderController.listApis);

// Assign Device to API
router.post('/:id/apis/:api_id/devices/:device_id', requireApplicationRole(['ADMIN']), apiBuilderController.assignDevice);

// Configure Fields
router.patch('/:id/apis/:api_id/fields', requireApplicationRole(['ADMIN']), apiBuilderController.configureFields);

// Create / List / Delete API Keys
router.post('/:id/apis/:api_id/keys', requireApplicationRole(['ADMIN']), apiBuilderController.createApiKey);
router.get('/:id/apis/:api_id/keys', requireApplicationRole(['ADMIN']), apiBuilderController.listApiKeys);
router.delete('/:id/apis/:api_id/keys/:key_id', requireApplicationRole(['ADMIN']), apiBuilderController.deleteApiKey);

// Frontend Hosting endpoints
const frontendController = require('../controllers/frontendController');
router.get('/:id/frontend', requireApplicationRole(['ADMIN', 'OPERATOR']), frontendController.getFrontend);
router.put('/:id/frontend', requireApplicationRole(['ADMIN']), frontendController.updateFrontend);

// Custom Application Dashboard (Phase 6G)
const dashboardController = require('../controllers/dashboardController');

// 1. Dashboard Admin APIs
router.post('/:application_id/dashboards', requireApplicationRole(['ADMIN']), dashboardController.createDashboard);
router.get('/:application_id/dashboards', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), dashboardController.getDashboards);
router.patch('/:application_id/dashboards/reorder', requireApplicationRole(['ADMIN']), dashboardController.reorderDashboards);
router.post('/:application_id/dashboards/:dashboard_id/duplicate', requireApplicationRole(['ADMIN']), dashboardController.duplicateDashboard);
router.get('/:application_id/dashboards/:dashboard_id', requireApplicationRole(['ADMIN']), dashboardController.getDashboard);
router.patch('/:application_id/dashboards/:dashboard_id', requireApplicationRole(['ADMIN']), dashboardController.updateDashboard);
router.delete('/:application_id/dashboards/:dashboard_id', requireApplicationRole(['ADMIN']), dashboardController.deleteDashboard);

// 2. Dashboard Pages Admin APIs
router.post('/:application_id/dashboards/:dashboard_id/pages', requireApplicationRole(['ADMIN']), dashboardController.createPage);
router.get('/:application_id/dashboards/:dashboard_id/pages', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), dashboardController.getPages);
router.patch('/:application_id/dashboards/:dashboard_id/pages/:page_id', requireApplicationRole(['ADMIN']), dashboardController.updatePage);
router.delete('/:application_id/dashboards/:dashboard_id/pages/:page_id', requireApplicationRole(['ADMIN']), dashboardController.deletePage);

// 3. Dashboard Widgets Admin APIs
router.post('/:application_id/dashboards/:dashboard_id/pages/:page_id/widgets', requireApplicationRole(['ADMIN']), dashboardController.createWidget);
router.get('/:application_id/dashboards/:dashboard_id/pages/:page_id/widgets', requireApplicationRole(['ADMIN']), dashboardController.getWidgets);
router.patch('/:application_id/dashboards/:dashboard_id/pages/:page_id/widgets/:widget_id', requireApplicationRole(['ADMIN']), dashboardController.updateWidget);
router.delete('/:application_id/dashboards/:dashboard_id/pages/:page_id/widgets/:widget_id', requireApplicationRole(['ADMIN']), dashboardController.deleteWidget);

// Domain Management APIs (Phase 6J)
const domainController = require('../controllers/domainController');
router.post('/:id/domains', requireApplicationRole(['ADMIN']), domainController.addDomain);
router.get('/:id/domains', requireApplicationRole(['ADMIN']), domainController.listDomains);
router.get('/:id/domains/:domain_id', requireApplicationRole(['ADMIN']), domainController.getDomain);
router.patch('/:id/domains/:domain_id', requireApplicationRole(['ADMIN']), domainController.updateDomain);
router.delete('/:id/domains/:domain_id', requireApplicationRole(['ADMIN']), domainController.deleteDomain);
router.post('/:id/domains/:domain_id/verify', requireApplicationRole(['ADMIN']), domainController.verifyDomain);


// Phase 6K: Dashboard Data Sources
const dashboardDataSourceController = require('../controllers/dashboardDataSourceController');
router.post('/:application_id/data-sources', requireApplicationRole(['ADMIN']), dashboardDataSourceController.createDataSource);
router.get('/:application_id/data-sources', requireApplicationRole(['ADMIN', 'OPERATOR', 'VIEWER']), dashboardDataSourceController.getDataSources);
router.put('/:application_id/data-sources/:source_id', requireApplicationRole(['ADMIN']), dashboardDataSourceController.updateDataSource);
router.delete('/:application_id/data-sources/:source_id', requireApplicationRole(['ADMIN']), dashboardDataSourceController.deleteDataSource);

// Phase 6K: Dashboard Data Query Endpoint
// Note: This endpoint is public for PUBLIC dashboards. We will use optionalApplicationRole which doesn't block unauthenticated users,
// but attaches req.user if they are logged in so we can check permissions for PRIVATE dashboards.
const { optionalApplicationAuth } = require('../middleware/applicationAuth');
router.get('/:application_id/dashboards/:dashboard_id/data', optionalApplicationAuth, dashboardDataController.getDashboardData);
module.exports = router;
