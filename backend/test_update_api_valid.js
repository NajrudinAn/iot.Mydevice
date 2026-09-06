require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ApiManagement = require('./src/models/apiManagement');
(async () => {
    try {
        const { rows } = await pool.query('SELECT id, workspace_id FROM apis LIMIT 1');
        const apiId = rows[0].id;
        const wsId = rows[0].workspace_id;
        const rRows = await pool.query('SELECT id FROM api_routes LIMIT 1');
        const routeId = rRows.rows[0].id;
        console.log("Updating API:", apiId, "with route", routeId);
        await ApiManagement.updateApi(apiId, wsId, {
            route_ids: [routeId]
        });
        console.log("Success");
    } catch (e) {
        console.error("FAIL", e);
    } finally {
        pool.end();
    }
})();
