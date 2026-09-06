const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initializeDatabase() {
    let client;
    try {
        client = await db.pool.connect();
        
        // 1. Serialize access: Only one worker initializes at a time
        const ADVISORY_LOCK_ID = 123456789;
        await client.query(`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID})`);

        // 2. Check if already initialized for this test suite run (within last 60s)
        const doneFile = path.join(__dirname, '.db_init_done');
        if (fs.existsSync(doneFile)) {
            const stats = fs.statSync(doneFile);
            if (Date.now() - stats.mtimeMs < 300000) {
                console.log("Database schema already initialized by another worker.");
                await client.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
                client.release();
                return;
            }
        }

        const schemaPath = path.join(__dirname, '../../../database/schema/init.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await client.query(schema);
        console.log("Database schema initialized successfully.");

        // Run migrations safely
        const migrationsPath = path.join(__dirname, '../../database/migrations');
        if (fs.existsSync(migrationsPath)) {
            const files = fs.readdirSync(migrationsPath).sort();
            for (const file of files) {
                if (file.endsWith('.sql')) {
                    const migrationSql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
                    await client.query(migrationSql);
                    console.log(`Migration applied: ${file}`);
                }
            }
        }

        // 3. Mark initialization as done
        fs.writeFileSync(doneFile, Date.now().toString());

        await client.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
        client.release();
    } catch (error) {
        console.error("Error initializing database schema:", error);
        if (client) {
            try {
                await client.query(`SELECT pg_advisory_unlock(123456789)`);
            } catch (unlockErr) {}
            client.release();
        }
        throw error; // ensure tests fail if init fails
    }
}

// Allow running directly
if (require.main === module) {
    initializeDatabase().then(() => process.exit(0));
}

module.exports = initializeDatabase;
