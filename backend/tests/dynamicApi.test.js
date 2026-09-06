const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');

describe('Phase 6F: Dynamic API Builder', () => {
    let tokenOwner;
    let workspaceId, appId, deviceA, deviceB, deviceUnassigned;
    let apiId, apiSlug = 'test-api-6f';
    let rawApiKey;

    beforeAll(async () => {
        // Register Owner
        const resOwner = await request(app).post('/api/auth/register').send({ name: 'Owner 6F', email: 'owner6f@test.com', password: 'password123' });
        tokenOwner = resOwner.body.token || (await request(app).post('/api/auth/login').send({ email: 'owner6f@test.com', password: 'password123'})).body.token;

        // Create Workspace
        const resWs = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'WS 6F' });
        workspaceId = resWs.body.workspace.id;

        // Create App
        appId = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App 6F' })).body.application.id;

        // Create Devices
        deviceA = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev A', device_type: 'ESP32' })).body.device.id;
        deviceB = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev B', device_type: 'ESP32' })).body.device.id;
        deviceUnassigned = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'Dev C', device_type: 'ESP32' })).body.device.id;

        // Assign A and B to App
        await request(app).post(`/api/applications/${appId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: deviceA });
        await request(app).post(`/api/applications/${appId}/devices`).set('Authorization', `Bearer ${tokenOwner}`).send({ device_id: deviceB });

        // Insert Sensor Data
        const d_A_external = (await pool.query('SELECT device_id FROM devices WHERE id = $1', [deviceA])).rows[0].device_id;
        const d_B_external = (await pool.query('SELECT device_id FROM devices WHERE id = $1', [deviceB])).rows[0].device_id;
        
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 25, 50)`, [d_A_external]);
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 25, 50)`, [d_B_external]);
    });

    afterAll(async () => {
        await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
        await pool.query("DELETE FROM users WHERE email = 'owner6f@test.com'");
        await pool.pool.end();
    });

    it('6F-01: Create API as ADMIN', async () => {
        const res = await request(app).post(`/api/applications/${appId}/apis`).set('Authorization', `Bearer ${tokenOwner}`).send({
            name: 'Test API',
            slug: apiSlug,
            description: 'My API',
            authentication_required: true
        });
        expect(res.status).toBe(201);
        apiId = res.body.api.id;
    });

    it('6F-06: Assign valid device', async () => {
        const res = await request(app).post(`/api/applications/${appId}/apis/${apiId}/devices/${deviceA}`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(res.status).toBe(200);
    });

    it('6F-22: Reject device from another application / unassigned', async () => {
        const res = await request(app).post(`/api/applications/${appId}/apis/${apiId}/devices/${deviceUnassigned}`).set('Authorization', `Bearer ${tokenOwner}`);
        expect(res.status).toBe(403);
    });

    it('6F-09: Configure allowed fields', async () => {
        const res = await request(app).patch(`/api/applications/${appId}/apis/${apiId}/fields`).set('Authorization', `Bearer ${tokenOwner}`).send({
            fields: ['device_id', 'temperature']
        });
        expect(res.status).toBe(200);
        expect(res.body.api.allowed_fields).toContain('temperature');
    });

    it('6F-10: Reject invalid fields', async () => {
        const res = await request(app).patch(`/api/applications/${appId}/apis/${apiId}/fields`).set('Authorization', `Bearer ${tokenOwner}`).send({
            fields: ['temperature', 'password_hash', 'secret_key']
        });
        expect(res.status).toBe(400);
    });

    it('6F-11, 6F-12: Create API key (Raw returned only once)', async () => {
        const res = await request(app).post(`/api/applications/${appId}/apis/${apiId}/keys`).set('Authorization', `Bearer ${tokenOwner}`).send({
            name: 'Prod Key'
        });
        expect(res.status).toBe(201);
        expect(res.body.raw_api_key).toBeDefined();
        rawApiKey = res.body.raw_api_key;
    });

    it('6F-14: Valid API key accesses API', async () => {
        const res = await request(app).get(`/api/v1/applications/${appId}/public-api/${apiSlug}`).set('X-API-Key', rawApiKey);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].temperature).toBeDefined();
        expect(res.body.data[0].humidity).toBeUndefined(); // Filtered out by fields!
    });

    it('6F-15: Invalid API key rejected', async () => {
        const res = await request(app).get(`/api/v1/applications/${appId}/public-api/${apiSlug}`).set('X-API-Key', 'invalid_key_string_here_too_long');
        expect(res.status).toBe(401);
    });

    it('6F-23: Device filtering works (Cannot access Device B because it was not added to API)', async () => {
        const externalB = (await pool.query('SELECT device_id FROM devices WHERE id = $1', [deviceB])).rows[0].device_id;
        const res = await request(app).get(`/api/v1/applications/${appId}/public-api/${apiSlug}?device_id=${externalB}`).set('X-API-Key', rawApiKey);
        expect(res.status).toBe(403);
    });

    it('6F-19: Public API works without key when auth is false', async () => {
        // Create new API with auth=false
        const resApi = await request(app).post(`/api/applications/${appId}/apis`).set('Authorization', `Bearer ${tokenOwner}`).send({
            name: 'Public API',
            slug: 'public-test',
            authentication_required: false
        });
        const pubId = resApi.body.api.id;
        await request(app).post(`/api/applications/${appId}/apis/${pubId}/devices/${deviceA}`).set('Authorization', `Bearer ${tokenOwner}`);
        
        // Request without API Key
        const resData = await request(app).get(`/api/v1/applications/${appId}/public-api/public-test`);
        expect(resData.status).toBe(200);
    });
});
