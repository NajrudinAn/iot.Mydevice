const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    try {
        // Find the route
        const routeRes = await pool.query("SELECT id FROM api_routes WHERE endpoint_slug LIKE 'home-env-realtime-data%'");
        if (routeRes.rows.length === 0) {
            console.log("Could not find the home-env route.");
            return;
        }
        const routeId = routeRes.rows[0].id;

        // Find the device mapping for this route
        const devRes = await pool.query("SELECT device_id FROM api_route_devices WHERE api_route_id = $1", [routeId]);
        if (devRes.rows.length === 0) {
            console.log("No device mapped to this route.");
            return;
        }
        const deviceUuid = devRes.rows[0].device_id;

        const targetField = `${deviceUuid}::power_consumption`;

        // Check if the permission already exists
        const permRes = await pool.query("SELECT id FROM api_route_data_permissions WHERE api_route_id = $1 AND field_path = $2", [routeId, targetField]);
        
        if (permRes.rows.length === 0) {
            await pool.query("INSERT INTO api_route_data_permissions (id, api_route_id, field_path) VALUES (gen_random_uuid(), $1, $2)", [routeId, targetField]);
            console.log("Successfully added power_consumption to the route permissions!");
        } else {
            console.log("power_consumption is already permitted on this route.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
fix();
