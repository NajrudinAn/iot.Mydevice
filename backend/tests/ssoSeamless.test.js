const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

describe('Seamless Application Access & SSO Tests', () => {
    let platformAdminToken;
    let ownerToken;
    let viewerToken;
    let otherToken;
    
    let ownerId;
    let viewerId;
    let otherId;
    
    let workspaceId;
    let applicationId;
    let applicationSlug = 'sso-farm-monitor';

    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        await db.query(`DELETE FROM applications WHERE slug = 'sso-farm-monitor'`);
        await db.query(`DELETE FROM users WHERE email IN ('admin-sso@test.com', 'owner-sso@test.com', 'viewer-sso@test.com', 'other-sso@test.com')`);

        // Register users
        await request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin-sso@test.com', password: 'password123' });
        await db.query(`UPDATE users SET is_platform_admin = true WHERE email = 'admin-sso@test.com'`);
        const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin-sso@test.com', password: 'password123' });
        platformAdminToken = adminLogin.body.token;

        await request(app).post('/api/auth/register').send({ name: 'Owner', email: 'owner-sso@test.com', password: 'password123' });
        const oLogin = await request(app).post('/api/auth/login').send({ email: 'owner-sso@test.com', password: 'password123' });
        ownerToken = oLogin.body.token;
        ownerId = oLogin.body.user.id;

        await request(app).post('/api/auth/register').send({ name: 'Viewer', email: 'viewer-sso@test.com', password: 'password123' });
        const vLogin = await request(app).post('/api/auth/login').send({ email: 'viewer-sso@test.com', password: 'password123' });
        viewerToken = vLogin.body.token;
        viewerId = vLogin.body.user.id;

        await request(app).post('/api/auth/register').send({ name: 'Other', email: 'other-sso@test.com', password: 'password123' });
        const otLogin = await request(app).post('/api/auth/login').send({ email: 'other-sso@test.com', password: 'password123' });
        otherToken = otLogin.body.token;
        otherId = otLogin.body.user.id;
    });

    afterAll(async () => {
        await db.query(`DELETE FROM users WHERE email IN ('admin-sso@test.com', 'owner-sso@test.com', 'viewer-sso@test.com', 'other-sso@test.com')`);
        await db.pool.end();
    });

    it('TEST 2: New user creates Workspace (Owner)', async () => {
        const res = await request(app)
            .post('/api/workspaces')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Smart Agriculture' });
        
        expect(res.statusCode).toBe(201);
        workspaceId = res.body.workspace.id;
        expect(res.body.workspace.owner_id).toBe(ownerId);
    });

    it('TEST 3: Workspace Owner creates Application', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/applications`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Farm Monitor', slug: applicationSlug, description: 'Monitor' });
        
        expect(res.statusCode).toBe(201);
        applicationId = res.body.application.id;
    });

    it('TEST 4: Owner shares Application with User B (Viewer)', async () => {
        // Owner gets app token via SSO
        const ssoRes = await request(app)
            .post(`/api/applications/${applicationId}/auth/sso`)
            .set('Authorization', `Bearer ${ownerToken}`);
        
        const ownerAppToken = ssoRes.body.token;

        const inviteRes = await request(app)
            .post(`/api/applications/${applicationId}/users`)
            .set('Authorization', `Bearer ${ownerAppToken}`)
            .send({ email: 'viewer-sso@test.com', role: 'VIEWER' });
        
        expect(inviteRes.statusCode).toBe(201);

        // Verify it appears in Shared Applications for Viewer
        const sharedRes = await request(app)
            .get('/api/users/me/shared-applications')
            .set('Authorization', `Bearer ${viewerToken}`);
        
        expect(sharedRes.statusCode).toBe(200);
        expect(sharedRes.body.applications).toHaveLength(1);
        expect(sharedRes.body.applications[0].id).toBe(applicationId);
    });

    it('TEST 5: Viewer opens application (Seamless SSO reuse)', async () => {
        const ssoRes = await request(app)
            .post(`/api/applications/${applicationId}/auth/sso`)
            .set('Authorization', `Bearer ${viewerToken}`);
        
        expect(ssoRes.statusCode).toBe(200);
        expect(ssoRes.body.token).toBeDefined();

        // Verify Application-scoped access by decoding the returned token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(ssoRes.body.token);
        expect(decoded.type).toBe('application');
        expect(decoded.applicationId).toBe(applicationId);
    });

    it('TEST 6: Viewer role is strictly preserved in SSO token', async () => {
        const ssoRes = await request(app)
            .post(`/api/applications/${applicationId}/auth/sso`)
            .set('Authorization', `Bearer ${viewerToken}`);
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(ssoRes.body.token);
        expect(decoded.role).toBe('VIEWER');
    });

    it('TEST 7/11: Other user attempts SSO for unauthorized application', async () => {
        const ssoRes = await request(app)
            .post(`/api/applications/${applicationId}/auth/sso`)
            .set('Authorization', `Bearer ${otherToken}`);
        
        expect(ssoRes.statusCode).toBe(403);
        expect(ssoRes.body.message).toBe('Not a member of this application');
    });

    it('TEST 8: User manipulates application ID', async () => {
        const fakeAppId = '00000000-0000-0000-0000-000000000000';
        const ssoRes = await request(app)
            .post(`/api/applications/${fakeAppId}/auth/sso`)
            .set('Authorization', `Bearer ${viewerToken}`);
        
        expect(ssoRes.statusCode).toBe(404);
    });

    it('TEST 9: Unauthenticated user attempt (No Token)', async () => {
        const ssoRes = await request(app)
            .post(`/api/applications/${applicationId}/auth/sso`);
            
        expect(ssoRes.statusCode).toBe(401);
    });

    it('TEST 12: Cross-workspace access attempt', async () => {
        // Viewer attempts to access Owner's workspace endpoints
        const res = await request(app)
            .post(`/api/workspaces/${workspaceId}/applications`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ name: 'Hack', slug: 'hack' });
            
        expect(res.statusCode).toBe(404);
    });
});
