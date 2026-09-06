const { handleData } = require('./backend/src/mqtt/handlers');
const db = require('./backend/src/config/db');

async function run() {
    try {
        await handleData('DEV-008-7191', {
            device_id: 'DEV-008-7191',
            data: { gps: { coordinates: { latitude: 40.0, longitude: -70.0 } } }
        });
        console.log("Success");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.pool.end();
    }
}
run();
