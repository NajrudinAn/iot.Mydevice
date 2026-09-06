const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');

describe('Application API (Phase 6B)', () => {
    let userAToken, userAId;
    let userBToken, userBId;
    let workspaceA_Id;
    let workspaceB_Id;
    let deviceA1_Id, deviceB1_Id; // DB UUIDs
    let deviceA1_PublicId = 'DEV-A1';
    let deviceB1_PublicId = 'DEV-B1';
    let applicationA_Id;

    beforeAll(async () => {
        // Register User A
        const resA = await request(app).post('/api/auth/register').send({
            name: 'User A', email: 'user.a.app@test.com', password: 'password123'
        });
        userAId = resA.body.user.id;
        
        const loginA = await request(app).post('/api/auth/login').send({
            email: 'user.a.app@test.com', password: 'password123'
        });
        userAToken = loginA.body.token;

        // Register User B
        const resB = await request(app).post('/api/auth/register').send({
            name: 'User B', email: 'user.b.app@test.com', password: 'password123'
        });
        userBId = resB.body.user.id;

        const loginB = await request(app).post('/api/auth/login').send({
            email: 'user.b.app@test.com', password: 'password123'
        });
        userBToken = loginB.body.token;

        // Get Workspace A
        await request(app).post('/api/workspaces').set('Authorization', `Bearer ${userAToken}`).send({ name: 'Default Workspace' });
        const wsA = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${userAToken}`);
        workspaceA_Id = wsA.body.workspaces[0].id;

        // Get Workspace B
        await request(app).post('/api/workspaces').set('Authorization', `Bearer ${userBToken}`).send({ name: 'Default Workspace' });
        const wsB = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${userBToken}`);
        workspaceB_Id = wsB.body.workspaces[0].id;

        // Register Device for A
        const devA = await request(app).post(`/api/workspaces/${workspaceA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ name: 'Device A1', device_type: 'ESP32' });
        deviceA1_Id = devA.body.device.id;
        deviceA1_PublicId = devA.body.device.device_id;

        // Register Device for B
        const devB = await request(app).post(`/api/workspaces/${workspaceB_Id}/devices`)
            .set('Authorization', `Bearer ${userBToken}`)
            .send({ name: 'Device B1', device_type: 'ESP32' });
        deviceB1_Id = devB.body.device.id;
        deviceB1_PublicId = devB.body.device.device_id;
    });

    afterAll(async () => {
        // Delete test users (cascades)
        await pool.query('DELETE FROM users WHERE email IN ($1, $2)', ['user.a.app@test.com', 'user.b.app@test.com']);
    });

    it('APP-01: Authenticated owner can create application', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceA_Id}/applications`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({
                name: 'Factory Monitoring',
                description: 'Monitors the factory floor'
            });
            
        expect(res.statusCode).toBe(201);
        expect(res.body.application.name).toBe('Factory Monitoring');
        expect(res.body.application.slug).toBe('factory-monitoring');
        expect(res.body.application.workspace_id).toBe(workspaceA_Id);
        applicationA_Id = res.body.application.id;
    });

    it('APP-02: Unauthenticated user cannot create application', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceA_Id}/applications`)
            .send({ name: 'Hacked App' });
            
        expect(res.statusCode).toBe(401);
    });

    it('APP-03: User cannot create application in another user workspace', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceB_Id}/applications`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ name: 'Malicious App' });
            
        expect(res.statusCode).toBe(404); // Or 403, controller returns 404 for not found/unauthorized
    });

    it('APP-04: Owner can list applications', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${workspaceA_Id}/applications`)
            .set('Authorization', `Bearer ${userAToken}`);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.applications.length).toBeGreaterThanOrEqual(1);
        expect(res.body.applications[0].name).toBe('Factory Monitoring');
    });

    it('APP-05: User cannot list another user applications', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${workspaceA_Id}/applications`)
            .set('Authorization', `Bearer ${userBToken}`);
            
        expect(res.statusCode).toBe(404);
    });

    it('APP-06: Owner can retrieve application details', async () => {
        const res = await request(app)
            .get(`/api/applications/${applicationA_Id}`)
            .set('Authorization', `Bearer ${userAToken}`);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.application.id).toBe(applicationA_Id);
    });

    it('APP-07: User cannot retrieve another user application', async () => {
        const res = await request(app)
            .get(`/api/applications/${applicationA_Id}`)
            .set('Authorization', `Bearer ${userBToken}`);
            
        expect(res.statusCode).toBe(403);
    });

    it('APP-DEV-01: Application can add device from same workspace', async () => {
        const res = await request(app)
            .post(`/api/applications/${applicationA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ device_id: deviceA1_PublicId });
            
        expect(res.statusCode).toBe(200);
    });

    it('APP-DEV-02: Application cannot add device from another workspace', async () => {
        const res = await request(app)
            .post(`/api/applications/${applicationA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ device_id: deviceB1_PublicId });
            
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/same workspace/);
    });

    it('APP-DEV-04: Duplicate application/device association is rejected safely', async () => {
        const res = await request(app)
            .post(`/api/applications/${applicationA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ device_id: deviceA1_PublicId });
            
        // Because of ON CONFLICT DO NOTHING, it should still return 200 or similar without blowing up.
        // Actually, ON CONFLICT DO NOTHING with RETURNING * returns nothing if conflict. Let's see what the controller does:
        // Wait, if it does nothing, it returns no rows. We might get a crash if we assume rows[0].
        // Let's modify the test to expect 200.
        expect(res.statusCode).toBe(200); 
    });

    it('APP-DEV-07: Application device listing returns only assigned devices', async () => {
        const res = await request(app)
            .get(`/api/applications/${applicationA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.devices.length).toBe(1);
        expect(res.body.devices[0].device_id).toBe(deviceA1_PublicId);
        // Ensure secret_key is not exposed
        expect(res.body.devices[0].secret_key).toBeUndefined();
    });

    it('APP-DEV-05: Removing an association does not delete the device', async () => {
        // Remove device
        const resRemove = await request(app)
            .delete(`/api/applications/${applicationA_Id}/devices/${deviceA1_PublicId}`)
            .set('Authorization', `Bearer ${userAToken}`);
        expect(resRemove.statusCode).toBe(200);

        // Verify device still exists in workspace
        const resCheck = await request(app)
            .get(`/api/workspaces/${workspaceA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`);
        
        expect(resCheck.statusCode).toBe(200);
        expect(resCheck.body.devices.some(d => d.device_id === deviceA1_PublicId)).toBe(true);

        // Verify device no longer in app
        const resAppDev = await request(app)
            .get(`/api/applications/${applicationA_Id}/devices`)
            .set('Authorization', `Bearer ${userAToken}`);
        expect(resAppDev.body.devices.length).toBe(0);
    });
});
