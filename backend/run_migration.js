const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/012_phase6o_indexes.sql'), 'utf8');
    try {
        await pool.query(sql);
        console.log('Migration successful');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit(0);
    }
}
run();
