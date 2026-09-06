const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/iot_platform'
});

async function main() {
  try {
    // 1. Create a Platform User & Workspace (Prerequisite)
    const platUserId = uuidv4();
    const wsId = uuidv4();
    const platUserHash = await bcrypt.hash('password123', 10);
    
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, 'Plat Admin', $2, $3)`,
      [platUserId, `plat_${Date.now()}@mydevice.internal`, platUserHash]
    );

    await pool.query(
      `INSERT INTO workspaces (id, name, owner_id) VALUES ($1, 'Demo Workspace', $2)`,
      [wsId, platUserId]
    );

    // 2. Create the Application
    const appId = uuidv4();
    await pool.query(
      `INSERT INTO applications (id, workspace_id, name, slug) VALUES ($1, $2, 'Test IoT App', $3)`,
      [appId, wsId, `test-iot-app-${Date.now()}`]
    );

    // 3. Create the Application User (Admin)
    const appUserId = uuidv4();
    const appUserHash = await bcrypt.hash('admin123', 10);
    const appEmail = `admin@app.local`;

    await pool.query(`DELETE FROM users WHERE email = $1`, [appEmail]);

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, 'App Owner', $2, $3)`,
      [appUserId, appEmail, appUserHash]
    );

    await pool.query(
      `INSERT INTO application_users (id, application_id, user_id, role) 
       VALUES ($1, $2, $3, 'ADMIN')`,
      [uuidv4(), appId, appUserId]
    );

    console.log(`\n✅ Successfully created Application and Application Admin User!`);
    console.log(`\nURL: http://localhost:5173/applications/${appId}/login`);
    console.log(`Email: ${appEmail}`);
    console.log(`Password: admin123`);
    console.log(`\nApp ID: ${appId}`);

  } catch (e) {
    console.error("Error setting up application data:", e);
  } finally {
    pool.end();
  }
}

main();
