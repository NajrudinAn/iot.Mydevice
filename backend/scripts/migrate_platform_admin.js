const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/iot_platform'
});

async function main() {
  try {
    // Check if column exists first
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='is_platform_admin'
    `);
    
    if (res.rows.length === 0) {
      console.log('Adding is_platform_admin column...');
      await pool.query(`ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;`);
      
      // Set the very first user as platform admin (usually the one seeded initially)
      await pool.query(`
        UPDATE users 
        SET is_platform_admin = TRUE 
        WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
      `);

      // Set any plat_* users created during testing to TRUE
      await pool.query(`
        UPDATE users 
        SET is_platform_admin = TRUE 
        WHERE email LIKE 'plat_%'
      `);
      
      console.log('Migration completed successfully.');
    } else {
      console.log('Column is_platform_admin already exists.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

main();
