const db = require('../config/db');

class User {
    static async create(name, email, password_hash) {
        const query = `
            INSERT INTO users (name, email, password_hash) 
            VALUES ($1, $2, $3) 
            RETURNING id, name, email, created_at
        `;
        const result = await db.query(query, [name, email, password_hash]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const query = `SELECT * FROM users WHERE email = $1`;
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const query = `SELECT * FROM users WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async setResetToken(userId, token, expiresAt) {
        const query = `
            UPDATE users 
            SET reset_password_token = $2, reset_password_expires_at = $3 
            WHERE id = $1
            RETURNING id, email
        `;
        const result = await db.query(query, [userId, token, expiresAt]);
        return result.rows[0];
    }

    static async findByResetToken(token) {
        const query = `
            SELECT * FROM users 
            WHERE reset_password_token = $1 AND reset_password_expires_at > CURRENT_TIMESTAMP
        `;
        const result = await db.query(query, [token]);
        return result.rows[0];
    }

    static async updatePassword(userId, password_hash) {
        const query = `
            UPDATE users 
            SET password_hash = $2, reset_password_token = NULL, reset_password_expires_at = NULL 
            WHERE id = $1
            RETURNING id, email
        `;
        const result = await db.query(query, [userId, password_hash]);
        return result.rows[0];
    }
}

module.exports = User;
