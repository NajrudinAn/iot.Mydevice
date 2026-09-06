const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');

describe('Phase 6C: Application Users & Access Control', () => {
    let tokenOwner, tokenOther, tokenOperator, tokenViewer;
    let ownerId, otherId, operatorId, viewerId;
    let workspaceId;
    let applicationId, applicationBId;
    let device1, device2;

    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        // Register Users
        const resOwner = await request(app).post('/api/auth/register').send({ name: 'Owner', email: 'owner6c@test.com', password: 'password123' });
        ownerId = resOwner.body.user.id;
        tokenOwner = resOwner.body.token || (await request(app).post('/api/auth/login').send({ email: 'owner6c@test.com', password: 'password123' })).body.token;

        const resOther = await request(app).post('/api/auth/register').send({ name: 'Other', email: 'other6c@test.com', password: 'password123' });
        otherId = resOther.body.user.id;
        tokenOther = resOther.body.token || (await request(app).post('/api/auth/login').send({ email: 'other6c@test.com', password: 'password123' })).body.token;

        const resOperator = await request(app).post('/api/auth/register').send({ name: 'Operator', email: 'operator6c@test.com', password: 'password123' });
        operatorId = resOperator.body.user.id;
        tokenOperator = resOperator.body.token || (await request(app).post('/api/auth/login').send({ email: 'operator6c@test.com', password: 'password123' })).body.token;

        const resViewer = await request(app).post('/api/auth/register').send({ name: 'Viewer', email: 'viewer6c@test.com', password: 'password123' });
        viewerId = resViewer.body.user.id;
        tokenViewer = resViewer.body.token || (await request(app).post('/api/auth/login').send({ email: 'viewer6c@test.com', password: 'password123' })).body.token;

        // Create Workspace
        const resWs = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Test WS 6C' });
        workspaceId = resWs.body.workspace.id;

        // Create Devices
        device1 = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev1', device_type: 'ESP32' })).body.device;
        device2 = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev2', device_type: 'ESP32' })).body.device;
        
        const dev1Uuid = (await pool.query('SELECT id FROM devices WHERE device_id = $1', [device1.device_id])).rows[0].id;
        const cap1 = (await pool.query(`INSERT INTO device_capabilities (device_id, workspace_id, name) VALUES ($1, $2, 'led') RETURNING id`, [dev1Uuid, workspaceId])).rows[0].id;
        await pool.query(`INSERT INTO device_capability_actions (capability_id, name) VALUES ($1, 'LED_ON')`, [cap1]);

        const dev2Uuid = (await pool.query('SELECT id FROM devices WHERE device_id = $1', [device2.device_id])).rows[0].id;
        const cap2 = (await pool.query(`INSERT INTO device_capabilities (device_id, workspace_id, name) VALUES ($1, $2, 'led') RETURNING id`, [dev2Uuid, workspaceId])).rows[0].id;
        await pool.query(`INSERT INTO device_capability_actions (capability_id, name) VALUES ($1, 'LED_ON')`, [cap2]);

        await pool.query(`UPDATE devices SET status = 'ONLINE' WHERE id IN ($1, $2)`, [dev1Uuid, dev2Uuid]);
    });

    afterAll(async () => {
        // Clean up
        await pool.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
        await pool.query("DELETE FROM users WHERE email LIKE '%6c@test.com'");
        await pool.pool.end();
    });

    it('6C-01: Workspace owner creates application and becomes ADMIN', async () => {
        const res = await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App A' });
        expect(res.status).toBe(201);
        applicationId = res.body.application.id;

        const resUsers = await request(app).get(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(resUsers.status).toBe(200);
        expect(resUsers.body.users.length).toBe(1);
        expect(resUsers.body.users[0].role).toBe('ADMIN');
        expect(resUsers.body.users[0].id).toBe(ownerId);
        
        // Also create App B for cross-app testing
        applicationBId = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App B' })).body.application.id;
    });

    it('6C-02: ADMIN adds existing user as OPERATOR', async () => {
        const res = await request(app).post(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'operator6c@test.com', role: 'OPERATOR' });
        expect(res.status).toBe(201);
        expect(res.body.membership.role).toBe('OPERATOR');
    });

    it('6C-03: ADMIN lists application users', async () => {
        const res = await request(app).get(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(res.status).toBe(200);
        expect(res.body.users.length).toBe(2);
    });

    it('6C-04: ADMIN changes user role', async () => {
        await request(app).post(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'viewer6c@test.com', role: 'VIEWER' });
        
        const res = await request(app).patch(`/api/applications/${applicationId}/users/${viewerId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ role: 'OPERATOR' });
        expect(res.status).toBe(200);
        expect(res.body.membership.role).toBe('OPERATOR');
        
        // Change back to viewer
        await request(app).patch(`/api/applications/${applicationId}/users/${viewerId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ role: 'VIEWER' });
    });

    it('6C-06: Duplicate membership rejected safely', async () => {
        const res = await request(app).post(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'operator6c@test.com', role: 'VIEWER' });
        expect(res.status).toBe(409);
    });

    it('6C-07 & 6C-08 & 6C-09: User Management Role Enforcement', async () => {
        // OPERATOR cannot add users
        const resOp = await request(app).post(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOperator}`).send({ email: 'other6c@test.com', role: 'VIEWER' });
        expect(resOp.status).toBe(403);

        // VIEWER cannot list users
        const resView = await request(app).get(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenViewer}`);
        expect(resView.status).toBe(403);
    });

    it('6C-10, 6C-11, 6C-12, 6C-13: Device Access & Commands', async () => {
        // Assign device1 to App A
        await request(app).post(`/api/applications/${applicationId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: device1.device_id });

        // OPERATOR can read telemetry
        let res = await request(app).get(`/api/applications/${applicationId}/devices/${device1.device_id}/data`).set('Authorization', `Bearer ${tokenOperator}`);
        expect(res.status).toBe(200);

        // VIEWER can read telemetry
        res = await request(app).get(`/api/applications/${applicationId}/devices/${device1.device_id}/data`).set('Authorization', `Bearer ${tokenViewer}`);
        expect(res.status).toBe(200);

        // VIEWER cannot execute command
        res = await request(app).post(`/api/applications/${applicationId}/devices/${device1.device_id}/commands`).set('Authorization', `Bearer ${tokenViewer}`).send({ type: 'LED_ON' });
        expect(res.status).toBe(403);

        // OPERATOR can execute command
        res = await request(app).post(`/api/applications/${applicationId}/devices/${device1.device_id}/commands`).set('Authorization', `Bearer ${tokenOperator}`).send({ type: 'LED_ON' });
        expect(res.status).toBe(202);

        // Unassigned device (device2) access denied
        res = await request(app).get(`/api/applications/${applicationId}/devices/${device2.device_id}/data`).set('Authorization', `Bearer ${tokenOperator}`);
        expect(res.status).toBe(403);
    });

    it('6C-14: Disabled user denied', async () => {
        // Disable OPERATOR
        await request(app).patch(`/api/applications/${applicationId}/users/${operatorId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ status: 'DISABLED' });
        
        const res = await request(app).get(`/api/applications/${applicationId}/devices/${device1.device_id}/data`).set('Authorization', `Bearer ${tokenOperator}`);
        expect(res.status).toBe(403);

        // Re-enable
        await request(app).patch(`/api/applications/${applicationId}/users/${operatorId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ status: 'ACTIVE' });
    });

    it('6C-15: Cross-application access denied', async () => {
        // Operator is not in App B
        const res = await request(app).get(`/api/applications/${applicationBId}/devices/${device1.device_id}/data`).set('Authorization', `Bearer ${tokenOperator}`);
        expect(res.status).toBe(403);
    });

    it('6C-19 & 6C-20: Last ADMIN protection', async () => {
        // Owner tries to demote themselves
        const resDemote = await request(app).patch(`/api/applications/${applicationId}/users/${ownerId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ role: 'OPERATOR' });
        expect(resDemote.status).toBe(400);

        // Owner tries to remove themselves
        const resRemove = await request(app).delete(`/api/applications/${applicationId}/users/${ownerId}`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(resRemove.status).toBe(400);

        // Add 'Other' as ADMIN
        await request(app).post(`/api/applications/${applicationId}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'other6c@test.com', role: 'ADMIN' });
        
        // Now Owner CAN demote themselves
        const resDemoteSuccess = await request(app).patch(`/api/applications/${applicationId}/users/${ownerId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ role: 'OPERATOR' });
        expect(resDemoteSuccess.status).toBe(200);
    });

    it('6C-05: ADMIN removes application user', async () => {
        const res = await request(app).delete(`/api/applications/${applicationId}/users/${viewerId}`).set('Authorization', `Bearer ${tokenOther}`); // 'Other' is the new ADMIN
        expect(res.status).toBe(200);
    });
});
