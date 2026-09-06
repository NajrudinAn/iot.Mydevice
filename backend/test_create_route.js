require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ApiManagement = require('./src/models/apiManagement');
(async () => {
    try {
        const { rows } = await pool.query('SELECT id, owner_id FROM workspaces LIMIT 1');
        const wsId = rows[0].id;
        const userId = rows[0].owner_id;
        console.log("WS", wsId, "USER", userId);
        const route = await ApiManagement.createRoute(wsId, {
            name: 'Test Route',
            purpose: 'CURRENT_DATA',
            device_ids: []
        }, userId);
        console.log("Success", route);
    } catch (e) {
        console.error("FAIL", e);
    } finally {
        pool.end();
    }
})();
