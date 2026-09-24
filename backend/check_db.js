const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const sdRes = await pool.query("SELECT device_id, payload, recorded_at FROM sensor_data ORDER BY recorded_at DESC LIMIT 5");
  console.log("Latest Sensor Data:", JSON.stringify(sdRes.rows, null, 2));
  
  const devRes = await pool.query("SELECT id, device_id, status FROM devices ORDER BY last_seen DESC LIMIT 5");
  console.log("Latest Devices:", JSON.stringify(devRes.rows, null, 2));
  
  pool.end();
}
check().catch(console.error);
