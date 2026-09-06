const db = require('../config/db');

class DashboardPage {
    static async create(dashboardId, name, slug, position) {
        const query = `
            INSERT INTO dashboard_pages (dashboard_id, name, slug, position)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await db.query(query, [dashboardId, name, slug, position || 0]);
        return result.rows[0];
    }

    static async findAll(dashboardId) {
        const query = 'SELECT * FROM dashboard_pages WHERE dashboard_id = $1 ORDER BY position ASC, created_at ASC';
        const result = await db.query(query, [dashboardId]);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM dashboard_pages WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, name, position) {
        const query = `
            UPDATE dashboard_pages
            SET name = COALESCE($2, name),
                position = COALESCE($3, position),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(query, [id, name, position]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM dashboard_pages WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows.length > 0;
    }
}

module.exports = DashboardPage;
