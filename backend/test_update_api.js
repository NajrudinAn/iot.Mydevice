require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ApiManagement = require('./src/models/apiManagement');
(async () => {
    try {
        const { rows } = await pool.query('SELECT id, workspace_id FROM apis LIMIT 1');
        const apiId = rows[0].id;
        const wsId = rows[0].workspace_id;
        console.log("Updating API:", apiId);
        await ApiManagement.updateApi(apiId, wsId, {
            route_ids: ['some-uuid']
        });
        console.log("Success");
    } catch (e) {
        console.error("FAIL", e);
    } finally {
        pool.end();
    }
})();
