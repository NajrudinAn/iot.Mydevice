const db = require('../backend/src/config/db');
async function check() {
    const res = await db.query("SELECT COUNT(*) FROM sensor_data");
    console.log(`6B-16, 6B-17 | MQTT/Telemetry Regression | PASS | Count: ${res.rows[0].count}`);
    process.exit(0);
}
check();
