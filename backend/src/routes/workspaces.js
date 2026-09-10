const express = require('express');
const workspaceController = require('../controllers/workspaceController');
const deviceController = require('../controllers/deviceController');
const applicationController = require('../controllers/applicationController');
const dataController = require('../controllers/dataController');
const commandController = require('../controllers/commandController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.get('/platform-stats', require('../controllers/platformStatsController').getPlatformStats);
router.get('/platform-workspaces', require('../controllers/platformStatsController').getPlatformWorkspaces);
router.get('/platform-applications', require('../controllers/platformStatsController').getPlatformApplications);
router.get('/platform-users', require('../controllers/platformStatsController').getPlatformUsers);
router.put('/platform-users/:id/promote', require('../controllers/platformStatsController').promoteToPlatformAdmin);
router.put('/platform-users/:id/demote', require('../controllers/platformStatsController').demoteFromPlatformAdmin);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

// Workspace Users
router.get('/:workspace_id/users', workspaceController.getWorkspaceUsers);

// Workspace Devices
router.post('/:workspace_id/devices', deviceController.registerDevice);
router.get('/:workspace_id/devices', deviceController.getDevices);
router.get('/:workspace_id/devices/live-status', deviceController.streamLiveStatus);

router.get('/:workspace_id/devices/:id', deviceController.getDeviceDetails);
router.get('/:workspace_id/devices/:id/capabilities', deviceController.getDeviceCapabilities);
router.put('/:workspace_id/devices/:id', deviceController.updateDevice);
router.delete('/:workspace_id/devices/:id', deviceController.deleteDevice);

// Workspace Commands
router.post('/:workspace_id/devices/:id/commands', commandController.sendCommand);
router.get('/:workspace_id/devices/:id/commands', commandController.getDeviceCommands);
router.get('/:workspace_id/commands', commandController.getWorkspaceCommands);

// Workspace Data
router.get('/:workspace_id/data', dataController.getWorkspaceData);
router.get('/:workspace_id/devices/:deviceId/data-fields', dataController.getDeviceDataFields);
router.get('/:workspace_id/devices/:deviceId/live-state', dataController.getDeviceLiveState);
router.patch('/:workspace_id/devices/:deviceId/data-fields/:field_name', dataController.updateDeviceDataField);

// Workspace Applications
router.post('/:workspace_id/applications', applicationController.createApplication);
router.get('/:workspace_id/applications', applicationController.getWorkspaceApplications);

// Workspace APIs (Management)
const apiManagementRouter = require('./apiManagement');
router.use('/:workspace_id/api-management', apiManagementRouter);

module.exports = router;
