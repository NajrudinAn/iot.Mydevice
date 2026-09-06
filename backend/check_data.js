const db = require('./src/config/db');
async function check() {
    const users = await db.query('SELECT COUNT(*) FROM users');
    const workspaces = await db.query('SELECT COUNT(*) FROM workspaces');
    const devices = await db.query('SELECT COUNT(*) FROM devices');
    const sensor_data = await db.query('SELECT COUNT(*) FROM sensor_data');
    const applications = await db.query('SELECT COUNT(*) FROM applications');
    const application_devices = await db.query('SELECT COUNT(*) FROM application_devices');
    console.log(`Users: ${users.rows[0].count}`);
    console.log(`Workspaces: ${workspaces.rows[0].count}`);
    console.log(`Devices: ${devices.rows[0].count}`);
    console.log(`Sensor Data: ${sensor_data.rows[0].count}`);
    console.log(`Applications: ${applications.rows[0].count}`);
    console.log(`Application Devices: ${application_devices.rows[0].count}`);
    process.exit(0);
}
check();
