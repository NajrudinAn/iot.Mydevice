const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

describe('IoT Platform API', () => {
    let token = '';
    let tokenUser2 = '';
    let deviceId = '';
    let workspaceId = '';
    let workspace2Id = '';
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const uniqueEmail2 = `testuser2_${Date.now()}@example.com`;

    beforeAll(async () => {
        // Initialize schema for test
        const initDb = require('../src/utils/initDb');
        await initDb();
    });

    afterAll(async () => {
        // Cleanup after tests
        await db.pool.end();
    });

    it('1. GET /api/health works', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('2. User registration works', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: uniqueEmail,
                password: 'password123'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user).toHaveProperty('id');
        expect(res.body).not.toHaveProperty('password_hash');
    });

    it('3. Duplicate registration fails', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User 2',
                email: uniqueEmail,
                password: 'password123'
            });
        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('4. Successful login works', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: uniqueEmail,
                password: 'password123'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token');
        token = res.body.token; // Save token for future requests
    });

    it('4.1 Create workspace for User 1', async () => {
        const res = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${token}`).send({ name: 'User 1 Workspace' });
        expect(res.statusCode).toBe(201);
        workspaceId = res.body.workspace.id;
    });

    it('5. Invalid password fails', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: uniqueEmail,
                password: 'wrongpassword'
            });
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('6. Unauthenticated device creation fails', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/devices`)
            .send({
                name: 'Smart Room',
                device_type: 'ESP32'
            });
        expect(res.statusCode).toBe(401);
    });

    it('7-9. Authenticated device creation generates ID and Key', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/devices`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Smart Room',
                device_type: 'ESP32'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.device).toHaveProperty('device_id');
        expect(res.body.device).toHaveProperty('secret_key');
        expect(res.body.device.status).toBe('OFFLINE');
        deviceId = res.body.device.id; // Internal UUID
    });

    it('10. Device list works and excludes secret keys', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${workspaceId}/devices`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.devices.length).toBeGreaterThan(0);
        expect(res.body.devices[0]).not.toHaveProperty('secret_key');
    });

    it('11. User isolation - Create User 2 and check device list', async () => {
        // Register User 2
        await request(app).post('/api/auth/register').send({
            name: 'User 2', email: uniqueEmail2, password: 'password123'
        });
        // Login User 2
        const loginRes = await request(app).post('/api/auth/login').send({
            email: uniqueEmail2, password: 'password123'
        });
        tokenUser2 = loginRes.body.token;

        const wsRes = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${tokenUser2}`).send({ name: 'User 2 Workspace' });
        workspace2Id = wsRes.body.workspace.id;

        // Fetch User 2 devices
        const res = await request(app)
            .get(`/api/workspaces/${workspace2Id}/devices`)
            .set('Authorization', `Bearer ${tokenUser2}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.devices.length).toBe(0); // Should not see User 1's device
    });

    it('12. Device details work', async () => {
        const res = await request(app)
            .get(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.device).toHaveProperty('name', 'Smart Room');
    });

    it('13. Unauthorized device access fails (User 2 trying to view User 1 device)', async () => {
        const res = await request(app)
            .get(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${tokenUser2}`);
        expect(res.statusCode).toBe(404);
    });

    it('14. Unauthorized device deletion fails (User 2 trying to delete User 1 device)', async () => {
        const res = await request(app)
            .delete(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${tokenUser2}`);
        expect(res.statusCode).toBe(404);
    });

    it('15. Device deletion works for owner and cannot be retrieved', async () => {
        const delRes = await request(app)
            .delete(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(delRes.statusCode).toBe(200);

        const getRes = await request(app)
            .get(`/api/devices/${deviceId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(getRes.statusCode).toBe(404);
    });
});
