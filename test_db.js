require('dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/src/config/db');
pool.query("SELECT device_id, payload, recorded_at FROM sensor_data ORDER BY recorded_at DESC LIMIT 5").then(res => { console.log(JSON.stringify(res.rows, null, 2)); pool.end(); }).catch(e => { console.error(e); pool.end(); });
