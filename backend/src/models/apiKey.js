const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class ApiKey {
    static async create(apiDefinitionId, name, expiresInDays = null) {
        // Generate a secure random string (e.g. 32 bytes = 64 hex chars)
        const rawKey = crypto.randomBytes(32).toString('hex');
        const keyPrefix = rawKey.substring(0, 16);
        
        // Hash the full key for storage
        const salt = await bcrypt.genSalt(10);
        const keyHash = await bcrypt.hash(rawKey, salt);
        
        let expiresAt = null;
        if (expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays, 10));
        }

        const query = `
            INSERT INTO api_keys (api_definition_id, name, key_prefix, key_hash, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, api_definition_id, name, key_prefix, enabled, expires_at, created_at;
        `;
        const result = await db.query(query, [apiDefinitionId, name, keyPrefix, keyHash, expiresAt]);
        
        // Return both the DB record AND the one-time raw key for the user
        return {
            record: result.rows[0],
            rawKey: rawKey
        };
    }

    static async verify(rawKey) {
        if (!rawKey || rawKey.length < 16) return null;
        
        const prefix = rawKey.substring(0, 16);
        
        // Find candidate by prefix
        const query = `
            SELECT * FROM api_keys 
            WHERE key_prefix = $1 AND enabled = true
        `;
        const result = await db.query(query, [prefix]);
        
        if (result.rows.length === 0) return null;
        
        const keyRecord = result.rows[0];
        
        // Check expiration
        if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)) {
            return null; // Expired
        }
        
        // Verify hash
        const isValid = await bcrypt.compare(rawKey, keyRecord.key_hash);
        if (!isValid) return null;
        
        // Return verified record
        return keyRecord;
    }

    static async updateLastUsed(keyId) {
        const query = `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`;
        await db.query(query, [keyId]);
    }

    static async listForApi(apiDefinitionId) {
        const query = `
            SELECT id, name, key_prefix, enabled, expires_at, last_used_at, created_at
            FROM api_keys
            WHERE api_definition_id = $1
            ORDER BY created_at DESC
        `;
        const result = await db.query(query, [apiDefinitionId]);
        return result.rows;
    }

    static async delete(keyId, apiDefinitionId) {
        const query = 'DELETE FROM api_keys WHERE id = $1 AND api_definition_id = $2 RETURNING id';
        const result = await db.query(query, [keyId, apiDefinitionId]);
        return result.rows.length > 0;
    }
}

module.exports = ApiKey;
