const db = require('../config/db');

class ApplicationUser {
    static async add(applicationId, userId, role, status = 'ACTIVE') {
        // Enforce role constraints if not done by DB (DB does it, but we can do it here too)
        const validRoles = ['ADMIN', 'OPERATOR', 'VIEWER'];
        if (!validRoles.includes(role)) {
            throw new Error('Invalid role');
        }

        const validStatuses = ['PENDING', 'ACTIVE', 'DISABLED'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const query = `
            INSERT INTO application_users (application_id, user_id, role, status)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [applicationId, userId, role, status];
        const res = await db.query(query, values);
        return res.rows[0];
    }

    static async findByApplicationId(applicationId) {
        const query = `
            SELECT au.id, au.application_id, au.user_id, au.role, au.status, au.created_at, u.name, u.email
            FROM application_users au
            JOIN users u ON au.user_id = u.id
            WHERE au.application_id = $1
        `;
        const res = await db.query(query, [applicationId]);
        return res.rows;
    }

    static async findByUserAndApplication(applicationId, userId) {
        const query = `
            SELECT * FROM application_users
            WHERE application_id = $1 AND user_id = $2
        `;
        const res = await db.query(query, [applicationId, userId]);
        return res.rows[0];
    }

    static async update(applicationId, userId, updates) {
        const fields = [];
        const values = [applicationId, userId];
        let idx = 3;

        if (updates.role) {
            fields.push(`role = $${idx++}`);
            values.push(updates.role);
        }
        if (updates.status) {
            fields.push(`status = $${idx++}`);
            values.push(updates.status);
        }

        if (fields.length === 0) return this.findByUserAndApplication(applicationId, userId);

        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        const query = `
            UPDATE application_users
            SET ${fields.join(', ')}
            WHERE application_id = $1 AND user_id = $2
            RETURNING *
        `;
        const res = await db.query(query, values);
        return res.rows[0];
    }

    static async remove(applicationId, userId) {
        const query = `DELETE FROM application_users WHERE application_id = $1 AND user_id = $2`;
        await db.query(query, [applicationId, userId]);
    }

    static async countActiveAdmins(applicationId, excludeUserId = null) {
        let query = `
            SELECT COUNT(*) FROM application_users
            WHERE application_id = $1 AND role = 'ADMIN' AND status = 'ACTIVE'
        `;
        const values = [applicationId];
        if (excludeUserId) {
            query += ` AND user_id != $2`;
            values.push(excludeUserId);
        }
        const res = await db.query(query, values);
        return parseInt(res.rows[0].count, 10);
    }
}

module.exports = ApplicationUser;
