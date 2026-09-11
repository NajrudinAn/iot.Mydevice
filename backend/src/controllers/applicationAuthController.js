const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const Application = require('../models/application');
const ApplicationUser = require('../models/applicationUser');
const Workspace = require('../models/workspace');
const emailService = require('../services/emailService');

const getSettings = async (req, res, next) => {
    try {
        const { id } = req.params;
        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        res.json({
            success: true,
            settings: {
                display_name: application.name,
                logo_url: application.branding?.logo_url || application.logo_url || null,
                authentication_enabled: application.authentication_enabled,
                registration_enabled: application.registration_enabled
            }
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (!application.authentication_enabled) {
            return res.status(403).json({ success: false, message: 'Application authentication is disabled' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const membership = await ApplicationUser.findByUserAndApplication(applicationId, user.id);
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Not a member of this application' });
        }

        if (membership.status === 'PENDING') {
            return res.status(403).json({ success: false, message: 'Membership is pending approval' });
        }

        if (membership.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, message: 'Membership is disabled' });
        }

        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
        const token = jwt.sign(
            { 
                type: 'application',
                id: user.id,
                email: user.email,
                applicationId: application.id,
                role: membership.role
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        return res.json({
            success: true,
            token,
            message: 'Application login successful'
        });
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        // req.user and req.applicationMembership is set by requireApplicationRole
        // req.application is set by requireApplicationRole
        const user = await User.findByEmail(req.user.email);
        
        return res.json({
            success: true,
            user_id: user.id,
            name: user.name,
            email: user.email,
            application_id: req.application.id,
            application_name: req.application.name,
            role: req.applicationMembership.role,
            membership_status: req.applicationMembership.status
        });
    } catch (err) {
        next(err);
    }
};

const updateSettings = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const { authentication_enabled, registration_enabled, approval_required } = req.body;

        const application = await Application.updateAuthSettings(
            applicationId,
            authentication_enabled ?? true,
            registration_enabled ?? false,
            approval_required ?? false
        );

        return res.json({
            success: true,
            message: 'Application authentication settings updated',
            application: {
                id: application.id,
                authentication_enabled: application.authentication_enabled,
                registration_enabled: application.registration_enabled,
                approval_required: application.approval_required
            }
        });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    // JWT is stateless, so we just return success.
    // Client is responsible for dropping the token.
    return res.json({
        success: true,
        message: 'Successfully logged out'
    });
};

const register = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (!application.registration_enabled) {
            return res.status(403).json({ success: false, message: 'Application registration is disabled' });
        }

        // Check if user already exists
        let user = await User.findByEmail(email);
        
        if (user) {
            // Case B: User already exists. Do NOT accept new password.
            return res.status(409).json({ 
                success: false, 
                code: 'ACCOUNT_EXISTS',
                message: 'ACCOUNT_EXISTS. AUTHENTICATED_ACCESS_REQUIRED.' 
            });
        }

        // Case A: Create user
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        user = await User.create(name, email, password_hash);

        const status = application.approval_required ? 'PENDING' : 'ACTIVE';
        const role = 'VIEWER'; // Default role
        
        const newMembership = await ApplicationUser.add(applicationId, user.id, role, status);

        return res.status(201).json({
            success: true,
            message: status === 'PENDING' ? 'Registration successful, pending approval' : 'Registration successful',
            membership: newMembership
        });
    } catch (err) {
        next(err);
    }
};

const requestAccess = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const userId = req.user.id; // User must be authenticated with platform JWT

        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (!application.registration_enabled) {
            return res.status(403).json({ success: false, message: 'Application registration is disabled' });
        }

        const membership = await ApplicationUser.findByUserAndApplication(applicationId, userId);
        if (membership) {
            return res.status(409).json({ success: false, message: 'User is already a member of this application' });
        }

        const status = application.approval_required ? 'PENDING' : 'ACTIVE';
        const role = 'VIEWER'; // Default role
        
        const newMembership = await ApplicationUser.add(applicationId, userId, role, status);

        return res.status(201).json({
            success: true,
            message: status === 'PENDING' ? 'Access requested, pending approval' : 'Access granted',
            membership: newMembership
        });
    } catch (err) {
        next(err);
    }
};

const sso = async (req, res, next) => {
    try {
        if (req.user.type === 'application') {
            return res.status(403).json({ success: false, message: 'Application tokens cannot be exchanged for SSO' });
        }
        
        const applicationId = req.params.id;
        const userId = req.user.id;
        const userEmail = req.user.email;

        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        let finalRole = null;

        // Check if user is Workspace Owner
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (workspace) {
            finalRole = 'ADMIN';
        } else {
            // Check if user has explicit membership
            const membership = await ApplicationUser.findByUserAndApplication(applicationId, userId);
            if (!membership) {
                return res.status(403).json({ success: false, message: 'Not a member of this application' });
            }
            if (membership.status === 'PENDING') {
                return res.status(403).json({ success: false, message: 'Membership is pending approval' });
            }
            if (membership.status !== 'ACTIVE') {
                return res.status(403).json({ success: false, message: 'Membership is disabled' });
            }
            finalRole = membership.role;
        }

        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
        const token = jwt.sign(
            { 
                type: 'application',
                id: userId,
                email: userEmail,
                applicationId: application.id,
                role: finalRole
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        return res.json({
            success: true,
            token,
            message: 'Application SSO successful'
        });
    } catch (err) {
        next(err);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        if (!application.authentication_enabled) {
            return res.status(403).json({ success: false, message: 'Application authentication is disabled' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
        }

        const membership = await ApplicationUser.findByUserAndApplication(applicationId, user.id);
        if (!membership) {
            // User exists on platform but is not a member of this app
            // We should still return generic success to avoid email enumeration
            return res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await User.setResetToken(user.id, token, expiresAt);

        // Reset URL should ideally point to the Application's UI, not the platform UI.
        // If the application uses the platform portal resolver, it will look like this:
        const baseUrl = process.env.FRONTEND_URL || 'https://mydevice.in';
        const resetUrl = `${baseUrl}/app/${application.slug}/reset-password?token=${token}`;
        
        try {
            await emailService.sendPasswordResetEmail(user.email, resetUrl);
        } catch (emailErr) {
            console.error('Failed to send email:', emailErr);
        }

        return res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
    } catch (err) {
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    // This is essentially identical to the platform resetPassword, 
    // but handled via the app-specific endpoint for consistency.
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const user = await User.findByResetToken(token);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await User.updatePassword(user.id, password_hash);

        return res.json({ success: true, message: 'Password has been successfully reset. You can now log in.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getSettings,
    login,
    register,
    getMe,
    logout,
    requestAccess,
    sso,
    updateSettings,
    forgotPassword,
    resetPassword
};
