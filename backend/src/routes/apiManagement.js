const express = require('express');
const router = express.Router({ mergeParams: true });
const Workspace = require('../models/workspace');
const apiManagementController = require('../controllers/apiManagementController');

// Middleware to verify workspace access
router.use(async (req, res, next) => {
    try {
        const workspaceId = req.params.workspace_id;
        const userId = req.user.id;
        
        const ws = await Workspace.findByIdAndOwnerId(workspaceId, userId);
        if (!ws) {
            return res.status(403).json({ success: false, message: 'Forbidden: Not your workspace' });
        }
        next();
    } catch (err) {
        next(err);
    }
});

// =====================================
// ROUTES (Endpoints)
// =====================================
router.get('/routes', apiManagementController.getRoutes);
router.post('/routes', apiManagementController.createRoute);
router.get('/routes/:route_id', apiManagementController.getRoute);
router.put('/routes/:route_id', apiManagementController.updateRoute);
router.delete('/routes/:route_id', apiManagementController.deleteRoute);

// =====================================
// APIs (Packages)
// =====================================
router.get('/apis', apiManagementController.getApis);
router.post('/apis', apiManagementController.createApi);
router.get('/apis/:api_id', apiManagementController.getApi);
router.put('/apis/:api_id', apiManagementController.updateApi);
router.delete('/apis/:api_id', apiManagementController.deleteApi);

// =====================================
// CREDENTIALS
// =====================================
router.post('/apis/:api_id/credentials', apiManagementController.createCredential);
router.post('/apis/:api_id/credentials/:credential_id/revoke', apiManagementController.revokeCredential);

// =====================================
// USER ACCESS
// =====================================
router.post('/apis/:api_id/users', apiManagementController.addUser);
router.delete('/apis/:api_id/users/:access_id', apiManagementController.removeUser);

module.exports = router;
