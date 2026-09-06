const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/auth');
const workspaceRoutes = require('../src/routes/workspaces');
const apiManagementRoutes = require('../src/routes/apiManagement');
const apiV1Routes = require('../src/routes/apiV1');
const deviceRoutes = require('../src/routes/devices');
const errorHandler = require('../src/middleware/errorHandler');
const db = require('../src/config/db');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', apiManagementRoutes);
app.use('/api/v1/routes', apiV1Routes);
app.use('/api/v1/public', apiV1Routes);
app.use('/api/devices', deviceRoutes);
app.use(errorHandler);

let userToken, userId, workspaceId, deviceId;
let publicRouteId, securedRouteId, publicApiId, publicApiSlug, publicEndpointSlug, securedApiId, securedEndpointSlug, apiKey, apiSecret, credId;

beforeAll(async () => {
    // 1. Setup User and Workspace
    const resA = await request(app).post('/api/auth/register').send({
        name: 'API Tester',
        email: 'apitester@workspace.com',
        password: 'password123'
    });
    userId = resA.body.user?.id;

    const loginA = await request(app).post('/api/auth/login').send({
        email: 'apitester@workspace.com',
        password: 'password123'
    });
    userToken = loginA.body.token;

    const wsRes = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${userToken}`).send({ name: 'API Workspace' });
    workspaceId = wsRes.body.workspace.id;

    // 2. Setup Device
    const devRes = await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${userToken}`).send({
        name: 'Test API Device',
        device_id: 'test-api-dev-01',
        device_type: 'SENSOR'
    });
    if (!devRes.body.device) {
        console.error('DEVICE CREATION FAILED:', devRes.body);
    }
    deviceId = devRes.body.device?.id;
});

afterAll(async () => {
    await db.query('DELETE FROM users WHERE email = $1', ['apitester@workspace.com']);
});

describe('API Management & Execution', () => {

    it('Should create a reusable route', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/api-management/routes`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'Public Status Route',
                purpose: 'DEVICE_STATUS',
                device_scope: 'ALL',
                is_active: true
            });
        expect(res.statusCode).toBe(201);
        publicRouteId = res.body.route.id;
        publicEndpointSlug = res.body.route.endpoint_slug;
    });

    it('Should package route into a PUBLIC_READ_ONLY API', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/api-management/apis`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'Public API',
                description: 'Public facing API',
                auth_mode: 'PUBLIC_READ_ONLY',
                route_ids: [publicRouteId]
            });
        expect(res.statusCode).toBe(201);
        publicApiId = res.body.api.id;
        publicApiSlug = res.body.api.api_slug;
    });

    it('Should execute PUBLIC route without auth', async () => {
        const res = await request(app).get(`/api/v1/public/${publicApiSlug}/${publicEndpointSlug}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.devices)).toBe(true);
    });

    it('Should create a second reusable route', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/api-management/routes`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'Secured Data Route',
                purpose: 'CURRENT_DATA',
                device_scope: 'ALL',
                is_active: true
            });
        expect(res.statusCode).toBe(201);
        securedRouteId = res.body.route.id;
        securedEndpointSlug = res.body.route.endpoint_slug;
    });

    it('Should package the second route into an API_KEY_SECRET API', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/api-management/apis`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'Sensor API',
                description: 'API for sensors',
                auth_mode: 'API_KEY_SECRET',
                route_ids: [securedRouteId]
            });
        expect(res.statusCode).toBe(201);
        securedApiId = res.body.api.id;
    });

    it('Should generate credentials for the secured API', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/api-management/apis/${securedApiId}/credentials`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'App Client 1'
            });
        expect(res.statusCode).toBe(201);
        apiKey = res.body.credential.api_key;
        apiSecret = res.body.credential.secret;
        credId = res.body.credential.id;
    });

    it('Should reject secured route without auth', async () => {
        const res = await request(app).get(`/api/v1/routes/${securedEndpointSlug}`);
        expect(res.statusCode).toBe(401);
    });

    it('Should reject secured route with invalid key', async () => {
        const res = await request(app).get(`/api/v1/routes/${securedEndpointSlug}`)
            .set('X-API-Key', 'invalid')
            .set('X-API-Secret', apiSecret);
        expect(res.statusCode).toBe(401);
    });

    it('Should execute secured route with valid key and secret', async () => {
        const res = await request(app).get(`/api/v1/routes/${securedEndpointSlug}`)
            .set('X-API-Key', apiKey)
            .set('X-API-Secret', apiSecret);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('Should reject after credential revocation', async () => {
        await request(app).post(`/api/workspaces/${workspaceId}/api-management/apis/${securedApiId}/credentials/${credId}/revoke`)
            .set('Authorization', `Bearer ${userToken}`);
            
        const res = await request(app).get(`/api/v1/routes/${securedEndpointSlug}`)
            .set('X-API-Key', apiKey)
            .set('X-API-Secret', apiSecret);
        expect(res.statusCode).toBe(401); // revoked
    });

});
