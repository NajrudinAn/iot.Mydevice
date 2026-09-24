const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const routes = await pool.query("SELECT id, name, endpoint_slug FROM api_routes");
  console.log("Routes:", routes.rows);
  const dataPerms = await pool.query("SELECT * FROM api_route_data_permissions");
  console.log("Permissions:", dataPerms.rows.slice(0, 5));
  pool.end();
}
check().catch(console.error);
