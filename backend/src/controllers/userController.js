const Application = require('../models/application');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const getSharedApplications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const applications = await Application.getSharedApplications(userId);

        return res.json({
            success: true,
            applications
        });
    } catch (err) {
        next(err);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Fetch user from DB
        const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userRes.rows[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

        return res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getSharedApplications,
    changePassword
};
