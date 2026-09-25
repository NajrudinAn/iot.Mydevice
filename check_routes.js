const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT route_path, allowed_data_fields FROM api_routes', (err, res) => {
  if (err) throw err;
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
