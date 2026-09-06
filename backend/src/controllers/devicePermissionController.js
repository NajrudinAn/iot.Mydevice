const ApplicationUserDevicePermission = require('../models/applicationUserDevicePermission');
const User = require('../models/user');
const ApplicationUser = require('../models/applicationUser');

exports.updatePermissions = async (req, res, next) => {
    try {
        const applicationId = req.application.id;
        const device = req.device; // Set by requireDevicePermission (actually, for PATCH we need requireApplicationRole, then manually fetch device. Wait! Let's just use requireDevicePermission('MANAGE_DEVICES') on the route, so device is assigned.)
        // But the prompt says "ADMIN -> manage application devices".
        // The middleware `requireApplicationRole(['ADMIN'])` handles application admins.
        
        const { user_id, can_view, can_read_data, can_command } = req.body;

        if (!user_id) {
            return res.status(400).json({ message: 'user_id is required' });
        }

        // Verify target user is in the application
        const membership = await ApplicationUser.findByUserAndApplication(applicationId, user_id);
        if (!membership) {
            return res.status(404).json({ message: 'Target user is not a member of this application' });
        }

        // Upsert permissions
        const result = await ApplicationUserDevicePermission.upsertPermissions(
            applicationId,
            user_id,
            device.id,
            can_view ?? true,
            can_read_data ?? true,
            can_command ?? false
        );

        return res.json({
            success: true,
            message: 'Permissions updated successfully',
            permission: result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating device permissions' });
    }
};

exports.listApplicationPermissions = async (req, res, next) => {
    try {
        const applicationId = req.application.id;
        const pool = require('../config/db');
        const query = `
            SELECT p.user_id, u.email, p.device_id, d.device_id as public_device_id, p.can_view, p.can_read_data, p.can_command
            FROM application_user_device_permissions p
            JOIN application_users au ON p.user_id = au.user_id AND p.application_id = au.application_id
            JOIN users u ON au.user_id = u.id
            JOIN devices d ON p.device_id = d.id
            WHERE p.application_id = $1;
        `;
        const result = await pool.query(query, [applicationId]);
        res.json({ permissions: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching permissions' });
    }
};
