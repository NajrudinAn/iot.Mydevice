const pool = require('../config/db');

class ApplicationFrontend {
    static async upsert(applicationId, htmlContent, cssContent, jsContent) {
        const query = `
            INSERT INTO application_frontends (application_id, html_content, css_content, js_content, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (application_id) 
            DO UPDATE SET 
                html_content = EXCLUDED.html_content,
                css_content = EXCLUDED.css_content,
                js_content = EXCLUDED.js_content,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        const result = await pool.query(query, [applicationId, htmlContent, cssContent, jsContent]);
        return result.rows[0];
    }

    static async getByApplicationId(applicationId) {
        const query = `SELECT * FROM application_frontends WHERE application_id = $1;`;
        const result = await pool.query(query, [applicationId]);
        return result.rows[0] || { html_content: '', css_content: '', js_content: '' };
    }
}

module.exports = ApplicationFrontend;
