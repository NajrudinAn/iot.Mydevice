const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');

describe('Phase 6E: Advanced Device, Data & Command Permissions', () => {
    let tokenOwner, ownerId;
    let tokenOperator, operatorId;
    let tokenViewer, viewerId;
    let tokenDisabled, disabledId;
    let workspaceId;
    let app1Id;
    let app2Id;
    let deviceA, deviceB, deviceC, deviceUnassigned;

    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        // Create users
        const resOwner = await request(app).post('/api/auth/register').send({ name: 'Owner 6E', email: 'owner6e@test.com', password: 'password123' });
        tokenOwner = resOwner.body.token || (await request(app).post('/api/auth/login').send({ email: 'owner6e@test.com', password: 'password123'})).body.token;
        ownerId = (await pool.query("SELECT id FROM users WHERE email='owner6e@test.com'")).rows[0].id;

        const resOp = await request(app).post('/api/auth/register').send({ name: 'Op 6E', email: 'op6e@test.com', password: 'password123' });
        operatorId = (await pool.query("SELECT id FROM users WHERE email='op6e@test.com'")).rows[0].id;

        const resView = await request(app).post('/api/auth/register').send({ name: 'View 6E', email: 'view6e@test.com', password: 'password123' });
        viewerId = (await pool.query("SELECT id FROM users WHERE email='view6e@test.com'")).rows[0].id;

        const resDis = await request(app).post('/api/auth/register').send({ name: 'Dis 6E', email: 'dis6e@test.com', password: 'password123' });
        disabledId = (await pool.query("SELECT id FROM users WHERE email='dis6e@test.com'")).rows[0].id;

        // Create Workspace
        const resWs = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'WS 6E' });
        workspaceId = resWs.body.workspace.id;

        // Create Apps
        app1Id = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App 1 6E' })).body.application.id;
        app2Id = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App 2 6E' })).body.application.id;

        // Add Members to App 1
        await request(app).post(`/api/applications/${app1Id}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'op6e@test.com', role: 'OPERATOR' });
        await request(app).post(`/api/applications/${app1Id}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'view6e@test.com', role: 'VIEWER' });
        await request(app).post(`/api/applications/${app1Id}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'dis6e@test.com', role: 'VIEWER' });
        await request(app).patch(`/api/applications/${app1Id}/users/${disabledId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ status: 'DISABLED' });

        // Get Application Tokens
        tokenOperator = (await request(app).post(`/api/applications/${app1Id}/auth/login`).send({ email: 'op6e@test.com', password: 'password123' })).body.token;
        tokenViewer = (await request(app).post(`/api/applications/${app1Id}/auth/login`).send({ email: 'view6e@test.com', password: 'password123' })).body.token;

        // Create Devices
        deviceA = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev A', device_type: 'ESP32' })).body.device.device_id;
        deviceB = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev B', device_type: 'ESP32' })).body.device.device_id;
        deviceC = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev C', device_type: 'ESP32' })).body.device.device_id;
        deviceUnassigned = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev Unassigned', device_type: 'ESP32' })).body.device.device_id;

        // Assign to App 1
        await request(app).post(`/api/applications/${app1Id}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: deviceA });
        await request(app).post(`/api/applications/${app1Id}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: deviceB });
        await request(app).post(`/api/applications/${app1Id}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: deviceC });

        // Assign to App 2
        await request(app).post(`/api/applications/${app2Id}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: deviceA }); // Shared

        // Insert Sensor Data (for reading test)
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 25, 50)`, [deviceA]);
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 25, 50)`, [deviceB]);
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 25, 50)`, [deviceC]);
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 25, 50)`, [deviceUnassigned]);

        // Insert Device Capabilities for LED_ON command
        const devAUuid = (await pool.query('SELECT id FROM devices WHERE device_id = $1', [deviceA])).rows[0].id;
        const capA = (await pool.query(`INSERT INTO device_capabilities (device_id, workspace_id, name) VALUES ($1, $2, 'led') RETURNING id`, [devAUuid, workspaceId])).rows[0].id;
        await pool.query(`INSERT INTO device_capability_actions (capability_id, name) VALUES ($1, 'LED_ON')`, [capA]);

        const devBUuid = (await pool.query('SELECT id FROM devices WHERE device_id = $1', [deviceB])).rows[0].id;
        const capB = (await pool.query(`INSERT INTO device_capabilities (device_id, workspace_id, name) VALUES ($1, $2, 'led') RETURNING id`, [devBUuid, workspaceId])).rows[0].id;
        await pool.query(`INSERT INTO device_capability_actions (capability_id, name) VALUES ($1, 'LED_ON')`, [capB]);

        const devCUuid = (await pool.query('SELECT id FROM devices WHERE device_id = $1', [deviceC])).rows[0].id;
        const capC = (await pool.query(`INSERT INTO device_capabilities (device_id, workspace_id, name) VALUES ($1, $2, 'led') RETURNING id`, [devCUuid, workspaceId])).rows[0].id;
        await pool.query(`INSERT INTO device_capability_actions (capability_id, name) VALUES ($1, 'LED_ON')`, [capC]);
        // Update device status to ONLINE
        await pool.query(`UPDATE devices SET status = 'ONLINE' WHERE id IN ($1, $2, $3)`, [devAUuid, devBUuid, devCUuid]);
    });

    afterAll(async () => {
        await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
        await pool.query("DELETE FROM users WHERE email LIKE '%6e@test.com'");
        await pool.pool.end();
    });

    it('6E-01, 6E-02, 6E-03: Admin has full access automatically', async () => {
        // Read telemetry
        const resRead = await request(app).get(`/api/applications/${app1Id}/devices/${deviceA}/data`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(resRead.status).toBe(200);
        // Execute Command
        const resCmd = await request(app).post(`/api/applications/${app1Id}/devices/${deviceA}/commands`).set('Authorization', `Bearer ${tokenOwner}`).send({ type: 'LED_ON' });
        expect(resCmd.status).toBe(202);
    });

    it('6E-04, 6E-05, 6E-06: Operator has default access based on role', async () => {
        // Read telemetry
        const resRead = await request(app).get(`/api/applications/${app1Id}/devices/${deviceA}/data`).set('Authorization', `Bearer ${tokenOperator}`);
        expect(resRead.status).toBe(200);
        // Execute Command
        const resCmd = await request(app).post(`/api/applications/${app1Id}/devices/${deviceA}/commands`).set('Authorization', `Bearer ${tokenOperator}`).send({ type: 'LED_ON' });
        expect(resCmd.status).toBe(202);
    });

    it('6E-07, 6E-08, 6E-09: Viewer has default read-only access based on role', async () => {
        // Read telemetry
        const resRead = await request(app).get(`/api/applications/${app1Id}/devices/${deviceA}/data`).set('Authorization', `Bearer ${tokenViewer}`);
        expect(resRead.status).toBe(200);
        // Execute Command (Denied)
        const resCmd = await request(app).post(`/api/applications/${app1Id}/devices/${deviceA}/commands`).set('Authorization', `Bearer ${tokenViewer}`).send({ type: 'LED_ON' });
        expect(resCmd.status).toBe(403);
    });

    it('6E-10: Device-specific restriction blocks operator', async () => {
        // Admin restricts operator on device B
        await request(app).patch(`/api/applications/${app1Id}/devices/${deviceB}/permissions`)
            .set('Authorization', `Bearer ${tokenOwner}`)
            .send({ user_id: operatorId, can_command: false, can_read_data: false });
        
        const resCmd = await request(app).post(`/api/applications/${app1Id}/devices/${deviceB}/commands`).set('Authorization', `Bearer ${tokenOperator}`).send({ type: 'LED_ON' });
        expect(resCmd.status).toBe(403);

        const resRead = await request(app).get(`/api/applications/${app1Id}/devices/${deviceB}/data`).set('Authorization', `Bearer ${tokenOperator}`);
        expect(resRead.status).toBe(403);
    });

    it('6E-11: Device-specific restriction blocks viewer', async () => {
        await request(app).patch(`/api/applications/${app1Id}/devices/${deviceB}/permissions`)
            .set('Authorization', `Bearer ${tokenOwner}`)
            .send({ user_id: viewerId, can_read_data: false });

        const resRead = await request(app).get(`/api/applications/${app1Id}/devices/${deviceB}/data`).set('Authorization', `Bearer ${tokenViewer}`);
        expect(resRead.status).toBe(403);
    });

    it('6E-12: Viewer cannot gain command access through device permission (Escalation protection)', async () => {
        await request(app).patch(`/api/applications/${app1Id}/devices/${deviceC}/permissions`)
            .set('Authorization', `Bearer ${tokenOwner}`)
            .send({ user_id: viewerId, can_command: true }); // Attempt escalation

        const resCmd = await request(app).post(`/api/applications/${app1Id}/devices/${deviceC}/commands`).set('Authorization', `Bearer ${tokenViewer}`).send({ type: 'LED_ON' });
        expect(resCmd.status).toBe(403); // Still blocked by ROLE max limit!
    });

    it('6E-13: User cannot access unassigned device', async () => {
        const res = await request(app).get(`/api/applications/${app1Id}/devices/${deviceUnassigned}/data`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(res.status).toBe(403);
    });

    it('6E-14: Cross-application access denied', async () => {
        // App 2 token
        const tokenOpApp2Res = await request(app).post(`/api/applications/${app2Id}/auth/login`).send({ email: 'op6e@test.com', password: 'password123' });
        // Operator doesn't belong to App 2, should fail login
        expect(tokenOpApp2Res.status).toBe(403);
    });

    it('6E-16: Unauthorized user cannot modify permissions', async () => {
        const res = await request(app).patch(`/api/applications/${app1Id}/devices/${deviceA}/permissions`)
            .set('Authorization', `Bearer ${tokenOperator}`)
            .send({ user_id: operatorId, can_command: true });
        expect(res.status).toBe(403);
    });

    it('6E-21: Unknown command rejected', async () => {
        const res = await request(app).post(`/api/applications/${app1Id}/devices/${deviceA}/commands`).set('Authorization', `Bearer ${tokenOwner}`).send({ type: 'SELF_DESTRUCT' });
        expect(res.status).toBe(400);
    });
});
