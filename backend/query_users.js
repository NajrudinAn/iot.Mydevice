const db = require('./src/config/db');
async function run() {
    try {
        const apps = await db.pool.query('SELECT id, name, slug FROM applications WHERE id = $1', ['9deb60f0-72d9-43a0-9058-929d19a45620']);
        console.log("APPLICATION:", apps.rows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        db.pool.end();
    }
}
run();
