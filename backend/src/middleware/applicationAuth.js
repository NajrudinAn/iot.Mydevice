const ApplicationUser = require('../models/applicationUser');
const Workspace = require('../models/workspace');
const Application = require('../models/application');
const jwt = require('jsonwebtoken');

const requireApplicationRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            // The application ID could be in req.params.id (for /api/applications/:id)
            // or req.params.application_id (for /api/applications/:application_id/...)
            const applicationId = req.params.id || req.params.application_id;

            if (!applicationId) {
                return res.status(400).json({ message: 'Application ID is missing in request' });
            }

            // Verify Application Token scope
            if (req.user.type === 'application') {
                if (req.user.applicationId !== applicationId) {
                    return res.status(403).json({ message: 'Application token is scoped to a different application' });
                }
            }

            const application = await Application.findById(applicationId);
            if (!application) {
                return res.status(404).json({ message: 'Application not found' });
            }

            // Check if user is Workspace Owner
            const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
            
            // Check if user is an application member
            const membership = await ApplicationUser.findByUserAndApplication(applicationId, userId);
            
            let userRole = null;
            let status = null;

            if (membership) {
                userRole = membership.role;
                status = membership.status;
            }

            // If the user is the Workspace Owner, they implicitly have 'ADMIN' rights for management.
            if (workspace) {
                userRole = 'ADMIN';
                status = 'ACTIVE';
            }

            if (!userRole) {
                return res.status(403).json({ message: 'Unauthorized: Not a member of this application' });
            }

            if (status !== 'ACTIVE') {
                return res.status(403).json({ message: 'Unauthorized: Membership is disabled' });
            }

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ message: 'Unauthorized: Insufficient role permissions' });
            }

            // Attach membership context for downstream
            req.applicationMembership = { role: userRole, status };
            req.application = application;

            next();
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error during authorization' });
        }
    };
};

const optionalApplicationAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Continue unauthenticated
        return next();
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
        return next();
    }

    try {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Will be populated with user info
        
        // Also figure out role
        const applicationId = req.params.id || req.params.application_id;
        if (applicationId) {
            if (req.user.type === 'application' && req.user.applicationId !== applicationId) {
                return next(); // Invalid app scope
            }
            
            const application = await Application.findById(applicationId);
            if (application) {
                const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, req.user.id);
                const membership = await ApplicationUser.findByUserAndApplication(applicationId, req.user.id);
                
                let userRole = null;
                if (membership && membership.status === 'ACTIVE') {
                    userRole = membership.role;
                }
                if (workspace) {
                    userRole = 'ADMIN';
                }
                
                req.user.role = userRole || 'PENDING';
            }
        }
    } catch (err) {
        console.error("Optional auth decode failed", err);
    }
    next();
};

module.exports = {
    requireApplicationRole,
    optionalApplicationAuth
};
