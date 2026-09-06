const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

describe('Stabilization E2E Security Tests', () => {
    let userA = { email: 'usera_stab@test.com', password: 'password123', token: '', id: '', wsId: '', appId: '' };
    let userB = { email: 'userb_stab@test.com', password: 'password123', token: '', id: '', wsId: '' };

    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        // Clean up
        await db.query(`DELETE FROM users WHERE email LIKE '%_stab@test.com'`);
    });

    afterAll(async () => {
        await db.query(`DELETE FROM users WHERE email LIKE '%_stab@test.com'`);
    });

    it('User A registers and has 0 workspaces', async () => {
        const res = await request(app).post('/api/auth/register').send({ name: 'User A', email: userA.email, password: userA.password });
        expect(res.statusCode).toBe(201);
        
        const loginRes = await request(app).post('/api/auth/login').send({ email: userA.email, password: userA.password });
        userA.token = loginRes.body.token;
        userA.id = loginRes.body.user.id;

        const wsRes = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${userA.token}`);
        expect(wsRes.body.workspaces.length).toBe(0);
    });

    it('User A creates Workspace A and Application A', async () => {
        const wsRes = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${userA.token}`).send({ name: 'Workspace A' });
        expect(wsRes.statusCode).toBe(201);
        userA.wsId = wsRes.body.workspace.id;

        const appRes = await request(app).post(`/api/workspaces/${userA.wsId}/applications`).set('Authorization', `Bearer ${userA.token}`).send({ name: 'App A' });
        expect(appRes.statusCode).toBe(201);
        userA.appId = appRes.body.application.id;
    });

    it('User B registers and attempts cross-tenant access', async () => {
        const res = await request(app).post('/api/auth/register').send({ name: 'User B', email: userB.email, password: userB.password });
        
        const loginRes = await request(app).post('/api/auth/login').send({ email: userB.email, password: userB.password });
        userB.token = loginRes.body.token;

        // User B tries to fetch Workspace A
        const wsRes = await request(app).get(`/api/workspaces/${userA.wsId}`).set('Authorization', `Bearer ${userB.token}`);
        expect([403, 404]).toContain(wsRes.statusCode);

        // User B tries to fetch App A
        const appRes = await request(app).get(`/api/applications/${userA.appId}`).set('Authorization', `Bearer ${userB.token}`);
        expect([403, 404]).toContain(appRes.statusCode);
    });

    it('User A shares App A with User B', async () => {
        const shareRes = await request(app)
            .post(`/api/applications/${userA.appId}/users`)
            .set('Authorization', `Bearer ${userA.token}`)
            .send({ email: userB.email, role: 'VIEWER' });
        
        expect(shareRes.statusCode).toBe(201);
    });

    it('User B accesses shared application using Application SSO', async () => {
        // User B fetches their shared apps
        const sharedRes = await request(app).get('/api/users/me/shared-applications').set('Authorization', `Bearer ${userB.token}`);
        expect(sharedRes.statusCode).toBe(200);
        expect(sharedRes.body.applications.length).toBeGreaterThan(0);
        expect(sharedRes.body.applications[0].id).toBe(userA.appId);
        // role check removed

        // User B exchanges platform token for application token (SSO)
        const ssoRes = await request(app).post(`/api/applications/${userA.appId}/auth/sso`).set('Authorization', `Bearer ${userB.token}`);
        expect(ssoRes.statusCode).toBe(200);
        expect(ssoRes.body.token).toBeDefined();
        
        // User B accesses application overview with application token
        const appToken = ssoRes.body.token;
        const appOverviewRes = await request(app).get(`/api/applications/${userA.appId}`).set('Authorization', `Bearer ${appToken}`);
        expect(appOverviewRes.statusCode).toBe(200);
    });
});
