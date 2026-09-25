const { pool } = require('./config/db');
(async () => {
    const res = await pool.query("SELECT id, name, device_id FROM devices WHERE name LIKE 'Factory%'");
    console.log(res.rows);
    process.exit(0);
})();
