const ApplicationUser = require('../models/applicationUser');
const User = require('../models/user');

exports.addUser = async (req, res) => {
    try {
        // Only ADMINs can add users. The middleware requireApplicationRole(['ADMIN']) enforces this.
        const applicationId = req.application.id;
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ message: 'Email and role are required' });
        }

        const validRoles = ['ADMIN', 'OPERATOR', 'VIEWER'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be ADMIN, OPERATOR, or VIEWER.' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found in platform. Cannot add unknown user.' });
        }

        try {
            const membership = await ApplicationUser.add(applicationId, user.id, role);
            res.status(201).json({ message: 'User added to application', membership: { id: membership.id, role: membership.role, status: membership.status } });
        } catch (dbErr) {
            if (dbErr.code === '23505') { // unique_violation
                return res.status(409).json({ message: 'User is already a member of this application' });
            }
            throw dbErr;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.listUsers = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const users = await ApplicationUser.findByApplicationId(applicationId);
        
        // Return safe metadata
        const safeUsers = users.map(u => ({
            id: u.user_id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            created_at: u.created_at
        }));

        res.status(200).json({ users: safeUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { user_id } = req.params;
        const { role, status } = req.body;

        if (role) {
            const validRoles = ['ADMIN', 'OPERATOR', 'VIEWER'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
        }

        if (status) {
            const validStatus = ['PENDING', 'ACTIVE', 'DISABLED'];
            if (!validStatus.includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
        }

        // Check last admin protection if demoting or disabling
        const membership = await ApplicationUser.findByUserAndApplication(applicationId, user_id);
        if (!membership) {
            return res.status(404).json({ message: 'Application membership not found' });
        }

        if (membership.role === 'ADMIN' && membership.status === 'ACTIVE') {
            if ((role && role !== 'ADMIN') || (status && status !== 'ACTIVE')) {
                const activeAdminCount = await ApplicationUser.countActiveAdmins(applicationId, user_id);
                if (activeAdminCount === 0) {
                    return res.status(400).json({ message: 'Cannot demote or disable the last active ADMIN of this application' });
                }
            }
        }

        const updated = await ApplicationUser.update(applicationId, user_id, { role, status });
        res.status(200).json({ message: 'Membership updated', membership: { id: updated.id, role: updated.role, status: updated.status } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.removeUser = async (req, res) => {
    try {
        const applicationId = req.application.id;
        const { user_id } = req.params;

        const membership = await ApplicationUser.findByUserAndApplication(applicationId, user_id);
        if (!membership) {
            return res.status(404).json({ message: 'Application membership not found' });
        }

        // Check last admin protection
        if (membership.role === 'ADMIN' && membership.status === 'ACTIVE') {
            const activeAdminCount = await ApplicationUser.countActiveAdmins(applicationId, user_id);
            if (activeAdminCount === 0) {
                return res.status(400).json({ message: 'Cannot remove the last active ADMIN of this application' });
            }
        }

        await ApplicationUser.remove(applicationId, user_id);
        res.status(200).json({ message: 'User removed from application successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
