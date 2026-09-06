const ApiManagement = require('../models/apiManagement');

// =====================================
// ROUTES (Endpoints)
// =====================================

exports.getRoutes = async (req, res) => {
    try {
        const routes = await ApiManagement.getRoutes(req.params.workspace_id);
        res.json({ success: true, routes });
    } catch (error) {
        console.error('getRoutes error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getRoute = async (req, res) => {
    try {
        const route = await ApiManagement.getRouteById(req.params.route_id, req.params.workspace_id);
        if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
        res.json({ success: true, route });
    } catch (error) {
        console.error('getRoute error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createRoute = async (req, res) => {
    try {
        const route = await ApiManagement.createRoute(req.params.workspace_id, req.body, req.user.id);
        res.status(201).json({ success: true, route });
    } catch (error) {
        console.error('createRoute error:', error);
        if (error.message.includes('ROUTE_CONFLICT')) {
            return res.status(409).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateRoute = async (req, res) => {
    try {
        const route = await ApiManagement.updateRoute(req.params.route_id, req.params.workspace_id, req.body);
        res.json({ success: true, route });
    } catch (error) {
        console.error('updateRoute error:', error);
        if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Route not found' });
        if (error.message.includes('ROUTE_CONFLICT')) return res.status(409).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteRoute = async (req, res) => {
    try {
        await ApiManagement.deleteRoute(req.params.route_id, req.params.workspace_id);
        res.json({ success: true, message: 'Route deleted' });
    } catch (error) {
        console.error('deleteRoute error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =====================================
// APIs (Packages)
// =====================================

exports.getApis = async (req, res) => {
    try {
        const apis = await ApiManagement.getApis(req.params.workspace_id);
        res.json({ success: true, apis });
    } catch (error) {
        console.error('getApis error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getApi = async (req, res) => {
    try {
        const api = await ApiManagement.getApiById(req.params.api_id, req.params.workspace_id);
        if (!api) return res.status(404).json({ success: false, message: 'API not found' });
        res.json({ success: true, api });
    } catch (error) {
        console.error('getApi error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createApi = async (req, res) => {
    try {
        const api = await ApiManagement.createApi(req.params.workspace_id, req.body, req.user.id);
        res.status(201).json({ success: true, api });
    } catch (error) {
        console.error('createApi error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateApi = async (req, res) => {
    try {
        const api = await ApiManagement.updateApi(req.params.api_id, req.params.workspace_id, req.body);
        res.json({ success: true, api });
    } catch (error) {
        console.error('updateApi error:', error);
        if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'API not found' });
        if (error.message === 'UNSAFE_ROUTES_NOT_ALLOWED') return res.status(400).json({ success: false, message: 'UNSAFE_ROUTES_NOT_ALLOWED' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteApi = async (req, res) => {
    try {
        await ApiManagement.deleteApi(req.params.api_id, req.params.workspace_id);
        res.json({ success: true, message: 'API deleted' });
    } catch (error) {
        console.error('deleteApi error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =====================================
// CREDENTIALS
// =====================================

exports.createCredential = async (req, res) => {
    try {
        const cred = await ApiManagement.createCredential(req.params.api_id, req.body, req.user.id);
        res.status(201).json({ success: true, credential: cred });
    } catch (error) {
        console.error('createCredential error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.revokeCredential = async (req, res) => {
    try {
        await ApiManagement.revokeCredential(req.params.credential_id, req.params.api_id);
        res.json({ success: true, message: 'Credential revoked' });
    } catch (error) {
        console.error('revokeCredential error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =====================================
// USER ACCESS
// =====================================

exports.addUser = async (req, res) => {
    try {
        await ApiManagement.addUser(req.params.api_id, req.body.app_user_id, req.user.id);
        res.status(201).json({ success: true, message: 'User added' });
    } catch (error) {
        console.error('addUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.removeUser = async (req, res) => {
    try {
        await ApiManagement.removeUser(req.params.access_id, req.params.api_id);
        res.json({ success: true, message: 'User removed' });
    } catch (error) {
        console.error('removeUser error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
