const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');

describe('Phase 6D: Application Authentication', () => {
    let tokenOwner;
    let ownerId;
    let workspaceId;
    let app1Id;
    let app2Id;
    
    let tokenOperator;
    let operatorId;

    let tokenViewer;
    let viewerId;
    
    let tokenDisabled;
    let disabledId;
    
    let tokenPlatformOnly;
    let platformOnlyId;
    
    let appTokenAdmin;
    let appTokenOperator;
    let appTokenViewer;
    let appTokenDisabled; // Will fail to generate

    beforeAll(async () => {
        // Register Owner
        const resOwner = await request(app).post('/api/auth/register').send({
            name: 'App Owner 6D', email: 'owner6d@test.com', password: 'password123'
        });
        tokenOwner = resOwner.body.token || (await request(app).post('/api/auth/login').send({ email: 'owner6d@test.com', password: 'password123'})).body.token;
        ownerId = resOwner.body.user ? resOwner.body.user.id : (await pool.query("SELECT id FROM users WHERE email='owner6d@test.com'")).rows[0].id;

        // Register other users
        const resOp = await request(app).post('/api/auth/register').send({ name: 'Op 6D', email: 'op6d@test.com', password: 'password123' });
        operatorId = resOp.body.user ? resOp.body.user.id : (await pool.query("SELECT id FROM users WHERE email='op6d@test.com'")).rows[0].id;

        const resView = await request(app).post('/api/auth/register').send({ name: 'View 6D', email: 'view6d@test.com', password: 'password123' });
        viewerId = resView.body.user ? resView.body.user.id : (await pool.query("SELECT id FROM users WHERE email='view6d@test.com'")).rows[0].id;

        const resDis = await request(app).post('/api/auth/register').send({ name: 'Dis 6D', email: 'dis6d@test.com', password: 'password123' });
        disabledId = resDis.body.user ? resDis.body.user.id : (await pool.query("SELECT id FROM users WHERE email='dis6d@test.com'")).rows[0].id;

        const resPlat = await request(app).post('/api/auth/register').send({ name: 'Plat 6D', email: 'plat6d@test.com', password: 'password123' });
        tokenPlatformOnly = resPlat.body.token || (await request(app).post('/api/auth/login').send({ email: 'plat6d@test.com', password: 'password123'})).body.token;

        // Create workspace
        const resWs = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'WS 6D' });
        workspaceId = resWs.body.workspace.id;

        // Create Applications
        app1Id = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App 1 6D' })).body.application.id;
        app2Id = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${tokenOwner}`).send({ name: 'App 2 6D' })).body.application.id;

        // Add users to App 1
        await request(app).post(`/api/applications/${app1Id}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'op6d@test.com', role: 'OPERATOR' });
        await request(app).post(`/api/applications/${app1Id}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'view6d@test.com', role: 'VIEWER' });
        await request(app).post(`/api/applications/${app1Id}/users`).set('Authorization', `Bearer ${tokenOwner}`).send({ email: 'dis6d@test.com', role: 'VIEWER' });
        
        // Disable the last one
        await request(app).patch(`/api/applications/${app1Id}/users/${disabledId}`).set('Authorization', `Bearer ${tokenOwner}`).send({ status: 'DISABLED' });
    });

    afterAll(async () => {
        await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
        await pool.query("DELETE FROM users WHERE email LIKE '%6d@test.com'");
        await pool.pool.end();
    });

    it('6D-01: Valid application login for ADMIN', async () => {
        const res = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({
            email: 'owner6d@test.com',
            password: 'password123'
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        appTokenAdmin = res.body.token;
    });

    it('6D-02: Incorrect password rejected', async () => {
        const res = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({
            email: 'owner6d@test.com',
            password: 'wrongpassword'
        });
        expect(res.status).toBe(401);
    });

    it('6D-03: Unknown user rejected', async () => {
        const res = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({
            email: 'nobody@test.com',
            password: 'password123'
        });
        expect(res.status).toBe(401);
    });

    it('6D-04: User not in application rejected', async () => {
        const res = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({
            email: 'plat6d@test.com',
            password: 'password123'
        });
        expect(res.status).toBe(403);
    });

    it('6D-05: Disabled membership rejected', async () => {
        const res = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({
            email: 'dis6d@test.com',
            password: 'password123'
        });
        expect(res.status).toBe(403);
        expect(res.body.message).toContain('disabled');
    });

    it('6D-07 & 6D-08: OPERATOR and VIEWER login successfully', async () => {
        const resOp = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({ email: 'op6d@test.com', password: 'password123' });
        expect(resOp.status).toBe(200);
        appTokenOperator = resOp.body.token;

        const resView = await request(app).post(`/api/applications/${app1Id}/auth/login`).send({ email: 'view6d@test.com', password: 'password123' });
        expect(resView.status).toBe(200);
        appTokenViewer = resView.body.token;
    });

    it('6D-09: Unauthenticated /me rejected', async () => {
        const res = await request(app).get(`/api/applications/${app1Id}/auth/me`);
        expect(res.status).toBe(401);
    });

    it('6D-10: Authenticated /me returns safe info', async () => {
        const res = await request(app).get(`/api/applications/${app1Id}/auth/me`).set('Authorization', `Bearer ${appTokenAdmin}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('owner6d@test.com');
        expect(res.body.role).toBe('ADMIN');
        expect(res.body.password_hash).toBeUndefined();
    });

    it('6D-11: Token/application mismatch rejected', async () => {
        // Use App1 token on App2
        const res = await request(app).get(`/api/applications/${app2Id}/auth/me`).set('Authorization', `Bearer ${appTokenAdmin}`);
        expect(res.status).toBe(403);
    });

    it('6D-12: Cross-application access isolated', async () => {
        // AppTokenAdmin belongs to owner. Owner created App2, so they are ADMIN in App2 too.
        // But AppTokenAdmin is scoped to App1. So attempting to add a device or user to App2 using App1 token must fail.
        const res = await request(app).get(`/api/applications/${app2Id}/users`).set('Authorization', `Bearer ${appTokenAdmin}`);
        expect(res.status).toBe(403);
    });

    it('6D-13: Authentication settings authorization for ADMIN', async () => {
        const res = await request(app).patch(`/api/applications/${app1Id}/auth/settings`)
            .set('Authorization', `Bearer ${appTokenAdmin}`)
            .send({ authentication_enabled: false });
        expect(res.status).toBe(200);
        expect(res.body.application.authentication_enabled).toBe(false);

        // Revert it
        await request(app).patch(`/api/applications/${app1Id}/auth/settings`)
            .set('Authorization', `Bearer ${appTokenAdmin}`)
            .send({ authentication_enabled: true });
    });

    it('6D-14 & 6D-15: VIEWER and OPERATOR cannot change settings', async () => {
        const res1 = await request(app).patch(`/api/applications/${app1Id}/auth/settings`)
            .set('Authorization', `Bearer ${appTokenViewer}`)
            .send({ authentication_enabled: false });
        expect(res1.status).toBe(403);

        const res2 = await request(app).patch(`/api/applications/${app1Id}/auth/settings`)
            .set('Authorization', `Bearer ${appTokenOperator}`)
            .send({ authentication_enabled: false });
        expect(res2.status).toBe(403);
    });

    it('6D-20: Application Token Cannot Access Platform APIs', async () => {
        // Attempt to create a workspace using an Application Token
        const res = await request(app).post('/api/workspaces')
            .set('Authorization', `Bearer ${appTokenAdmin}`)
            .send({ name: 'Hacked WS' });
        expect(res.status).toBe(403);
    });
});
