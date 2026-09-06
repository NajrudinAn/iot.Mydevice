const db = require('../config/db');

class ApplicationDomain {
    static async create({ application_id, hostname, type }) {
        // Normalize hostname: lowercase, remove protocol, remove trailing slash
        const normalizedHost = hostname.toLowerCase().replace(/^(https?:\/\/)?/, '').split('/')[0];
        
        const result = await db.query(
            `INSERT INTO application_domains (application_id, hostname, type, status, is_primary) 
             VALUES ($1, $2, $3, 'PENDING', false) RETURNING *`,
            [application_id, normalizedHost, type]
        );
        return result.rows[0];
    }

    static async findByApplicationId(application_id) {
        const result = await db.query(
            `SELECT * FROM application_domains WHERE application_id = $1 ORDER BY created_at DESC`,
            [application_id]
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await db.query(
            `SELECT * FROM application_domains WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async findByHostname(hostname) {
        const normalizedHost = hostname.toLowerCase().replace(/^(https?:\/\/)?/, '').split('/')[0];
        const result = await db.query(
            `SELECT d.*, a.slug as application_slug, a.name as application_name
             FROM application_domains d
             JOIN applications a ON d.application_id = a.id
             WHERE d.hostname = $1`,
            [normalizedHost]
        );
        return result.rows[0];
    }

    static async updateStatus(id, status, verification_token = null, verified_at = null) {
        const updates = ['status = $2'];
        const values = [id, status];
        let paramIdx = 3;

        if (verification_token !== undefined) {
            updates.push(`verification_token = $${paramIdx++}`);
            values.push(verification_token);
        }
        
        if (verified_at !== undefined) {
            updates.push(`verified_at = $${paramIdx++}`);
            values.push(verified_at);
        }

        const query = `UPDATE application_domains SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async setPrimary(application_id, domain_id) {
        // Transaction to ensure only one primary domain per application
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Unset current primary
            await client.query(
                `UPDATE application_domains SET is_primary = false WHERE application_id = $1`,
                [application_id]
            );

            // Set new primary (only if it's ACTIVE)
            const result = await client.query(
                `UPDATE application_domains SET is_primary = true WHERE id = $1 AND application_id = $2 AND status = 'ACTIVE' RETURNING *`,
                [domain_id, application_id]
            );

            if (result.rows.length === 0) {
                throw new Error("Domain not found or not active");
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async delete(id) {
        const result = await db.query(
            `DELETE FROM application_domains WHERE id = $1 RETURNING *`,
            [id]
        );
        return result.rows[0];
    }
}

module.exports = ApplicationDomain;
