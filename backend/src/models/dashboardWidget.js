const db = require('../config/db');

class DashboardWidget {
    static async create(pageId, type, title, x, y, w, h, config) {
        const query = `
            INSERT INTO dashboard_widgets (dashboard_page_id, widget_type, title, position_x, position_y, width, height, configuration)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const result = await db.query(query, [pageId, type, title, x || 0, y || 0, w || 1, h || 1, JSON.stringify(config || {})]);
        return result.rows[0];
    }

    static async findAll(pageId) {
        const query = 'SELECT * FROM dashboard_widgets WHERE dashboard_page_id = $1 ORDER BY position_y ASC, position_x ASC';
        const result = await db.query(query, [pageId]);
        return result.rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM dashboard_widgets WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async update(id, title, x, y, w, h, config) {
        const query = `
            UPDATE dashboard_widgets
            SET title = COALESCE($2, title),
                position_x = COALESCE($3, position_x),
                position_y = COALESCE($4, position_y),
                width = COALESCE($5, width),
                height = COALESCE($6, height),
                configuration = COALESCE($7, configuration),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(query, [id, title, x, y, w, h, config ? JSON.stringify(config) : null]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM dashboard_widgets WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows.length > 0;
    }
}

module.exports = DashboardWidget;
