const db = require('../config/db');

class Dashboard {
    static async create(applicationId, name, slug, description, status, visibility, userId) {
        const query = `
            INSERT INTO dashboards (application_id, name, slug, description, status, visibility, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const result = await db.query(query, [applicationId, name, slug, description, status || 'ACTIVE', visibility || 'PRIVATE', userId]);
        return result.rows[0];
    }

    static async findAll(applicationId) {
        const query = 'SELECT * FROM dashboards WHERE application_id = $1 ORDER BY position ASC, created_at ASC';
        const result = await db.query(query, [applicationId]);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM dashboards WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, name, description, status, visibility, slug, theme) {
        const query = `
            UPDATE dashboards
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                status = COALESCE($4, status),
                visibility = COALESCE($5, visibility),
                slug = COALESCE($6, slug),
                theme = COALESCE($7, theme),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(query, [id, name, description, status, visibility, slug, theme]);
        return result.rows[0];
    }

    static async updatePosition(id, position) {
        const query = `
            UPDATE dashboards
            SET position = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(query, [id, position]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM dashboards WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows.length > 0;
    }
}

module.exports = Dashboard;
