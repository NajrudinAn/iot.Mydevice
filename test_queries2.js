const db = require('./backend/src/config/db');
async function test() {
    try {
        await db.pool.query('SELECT COUNT(*) FROM api_definitions');
        console.log("api_definitions ok");
    } catch (e) {
        console.error("ERROR: ", e.message);
    } finally {
        db.pool.end();
    }
}
test();
