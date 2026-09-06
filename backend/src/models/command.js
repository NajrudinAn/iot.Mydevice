const pool = require('../config/db');

class Command {
    static async create({ workspace_id, application_id, device_id, requested_by_user_id, command_type, command_payload, correlation_id }) {
        const query = `
            INSERT INTO device_commands (
                workspace_id, application_id, device_id, requested_by_user_id, command_type, command_payload, correlation_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
            RETURNING *;
        `;
        const values = [workspace_id, application_id, device_id, requested_by_user_id, command_type, JSON.stringify(command_payload), correlation_id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async updateStatus(id, status, updates = {}) {
        let validPreviousStates = [];
        if (status === 'SENT') {
            validPreviousStates = ['PENDING'];
        } else if (status === 'ACKNOWLEDGED') {
            validPreviousStates = ['PENDING', 'SENT'];
        } else if (['COMPLETED', 'FAILED', 'REJECTED', 'TIMEOUT'].includes(status)) {
            validPreviousStates = ['PENDING', 'SENT', 'ACKNOWLEDGED'];
        }

        const setFields = ['status = $1'];
        const values = [status, id, validPreviousStates];
        let paramIndex = 4;

        if (status === 'SENT') {
            setFields.push(`sent_at = CURRENT_TIMESTAMP`);
        } else if (status === 'ACKNOWLEDGED') {
            setFields.push(`acknowledged_at = CURRENT_TIMESTAMP`);
        } else if (status === 'COMPLETED') {
            setFields.push(`completed_at = CURRENT_TIMESTAMP`);
        } else if (status === 'FAILED' || status === 'TIMEOUT' || status === 'REJECTED') {
            setFields.push(`failed_at = CURRENT_TIMESTAMP`);
        }

        if (updates.error_code) {
            setFields.push(`error_code = $${paramIndex++}`);
            values.push(updates.error_code);
        }
        if (updates.error_message) {
            setFields.push(`error_message = $${paramIndex++}`);
            values.push(updates.error_message);
        }
        if (updates.response_payload) {
            setFields.push(`response_payload = $${paramIndex++}`);
            values.push(JSON.stringify(updates.response_payload));
        }

        const query = `
            UPDATE device_commands 
            SET ${setFields.join(', ')} 
            WHERE id = $2 AND status = ANY($3)
            RETURNING *;
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rowCount === 0) {
            const current = await pool.query('SELECT status FROM device_commands WHERE id = $1', [id]);
            if (current.rows.length === 0) {
                throw new Error('Command not found');
            }
            if (current.rows[0].status === status) {
                // Duplicate idempotent update
                const cmd = await pool.query('SELECT * FROM device_commands WHERE id = $1', [id]);
                return cmd.rows[0];
            }
            // If the command is already in a final state and we get a stale update (e.g. timeout or late ack), just return it
            if (['COMPLETED', 'FAILED', 'REJECTED', 'TIMEOUT'].includes(current.rows[0].status) && ['ACKNOWLEDGED', 'TIMEOUT'].includes(status)) {
                 const cmd = await pool.query('SELECT * FROM device_commands WHERE id = $1', [id]);
                 return cmd.rows[0];
            }
            throw new Error(`Invalid state transition from ${current.rows[0].status} to ${status}`);
        }
        
        return result.rows[0];
    }

    static async findByCorrelationId(correlation_id) {
        const query = `SELECT * FROM device_commands WHERE correlation_id = $1`;
        const result = await pool.query(query, [correlation_id]);
        return result.rows[0];
    }

    static async getWorkspaceCommands(workspace_id, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT c.*, u.email as requested_by_email, d.device_id as public_device_id
            FROM device_commands c
            JOIN users u ON c.requested_by_user_id = u.id
            JOIN devices d ON c.device_id = d.id
            WHERE c.workspace_id = $1
            ORDER BY c.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const countQuery = `SELECT COUNT(*) FROM device_commands WHERE workspace_id = $1`;
        
        const [rowsResult, countResult] = await Promise.all([
            pool.query(query, [workspace_id, limit, offset]),
            pool.query(countQuery, [workspace_id])
        ]);

        return {
            commands: rowsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        };
    }

    static async getDeviceCommands(workspace_id, device_id, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT c.*, u.email as requested_by_email
            FROM device_commands c
            JOIN users u ON c.requested_by_user_id = u.id
            WHERE c.workspace_id = $1 AND c.device_id = $2
            ORDER BY c.created_at DESC
            LIMIT $3 OFFSET $4
        `;
        const countQuery = `SELECT COUNT(*) FROM device_commands WHERE workspace_id = $1 AND device_id = $2`;
        
        const [rowsResult, countResult] = await Promise.all([
            pool.query(query, [workspace_id, device_id, limit, offset]),
            pool.query(countQuery, [workspace_id, device_id])
        ]);

        return {
            commands: rowsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        };
    }

    static async processTimeouts(timeoutSeconds = 15) {
        const query = `
            WITH timed_out AS (
                UPDATE device_commands
                SET status = 'TIMEOUT', failed_at = CURRENT_TIMESTAMP, error_code = 'COMMAND_TIMEOUT', error_message = 'Device did not acknowledge command in time'
                WHERE status = 'SENT' AND sent_at < NOW() - INTERVAL '${timeoutSeconds} seconds'
                RETURNING *
            )
            SELECT t.*, d.device_id as public_device_id
            FROM timed_out t
            JOIN devices d ON t.device_id = d.id;
        `;
        const result = await pool.query(query);
        return result.rows; // Returns array of timed out commands
    }
}

module.exports = Command;
