require('dotenv').config({path: 'backend/.env'});
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
async function run() {
  const users = await pool.query('SELECT count(*) FROM users');
  const apps = await pool.query('SELECT count(*) FROM applications');
  const devices = await pool.query('SELECT count(*) FROM devices');
  const sources = await pool.query('SELECT count(*) FROM dashboard_data_sources');
  console.log('Users:', users.rows[0].count);
  console.log('Applications:', apps.rows[0].count);
  console.log('Devices:', devices.rows[0].count);
  console.log('Data Sources:', sources.rows[0].count);
  process.exit(0);
}
run();
