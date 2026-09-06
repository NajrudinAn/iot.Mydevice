const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

describe('User Portal & Sharing Security Tests', () => {
    let platformAdminToken;
    let user1Token;
    let user2Token;
    let user1Id;
    let user2Id;
    let workspace1Id;
    let app1Id;
    let app1Slug = 'test-app-portal-1';

    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        // Register Users via the API to get correct hashed passwords and tokens
        await request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin-portal@test.com', password: 'password123', isPlatformAdmin: true });
        const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin-portal@test.com', password: 'password123' });
        platformAdminToken = adminLogin.body.token;
        
        await db.query(`UPDATE users SET is_platform_admin = true WHERE email = 'admin-portal@test.com'`); // Force admin

        await request(app).post('/api/auth/register').send({ name: 'User 1', email: 'user1-portal@test.com', password: 'password123' });
        const u1Login = await request(app).post('/api/auth/login').send({ email: 'user1-portal@test.com', password: 'password123' });
        user1Token = u1Login.body.token;
        user1Id = u1Login.body.user.id;

        await request(app).post('/api/auth/register').send({ name: 'User 2', email: 'user2-portal@test.com', password: 'password123' });
        const u2Login = await request(app).post('/api/auth/login').send({ email: 'user2-portal@test.com', password: 'password123' });
        user2Token = u2Login.body.token;
        user2Id = u2Login.body.user.id;
    });

    afterAll(async () => {
        await db.query(`DELETE FROM workspaces WHERE name = 'Workspace U1'`);
        await db.query(`DELETE FROM users WHERE email IN ('admin-portal@test.com', 'user1-portal@test.com', 'user2-portal@test.com')`);
        await db.pool.end();
    });

    it('1. Existing platform authentication regression', async () => {
        const res = await request(app)
            .get('/api/workspaces/platform-workspaces')
            .set('Authorization', `Bearer ${platformAdminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('2. Workspace creation ownership securely derived from token', async () => {
        const res = await request(app)
            .post('/api/workspaces')
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ name: 'Workspace U1' });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.workspace.owner_id).toBe(user1Id);
        workspace1Id = res.body.workspace.id;

        // Ensure user is still not platform admin
        const meRes = await db.query(`SELECT is_platform_admin FROM users WHERE id = $1`, [user1Id]);
        expect(meRes.rows[0].is_platform_admin).toBe(false);
    });

    it('3. Workspace isolation (User 2 cannot see User 1 workspace)', async () => {
        const res = await request(app)
            .get('/api/workspaces')
            .set('Authorization', `Bearer ${user2Token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.workspaces).toHaveLength(0);
    });

    it('4. User 1 creates an application in their workspace', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${workspace1Id}/applications`)
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ name: 'App 1', slug: app1Slug, description: 'Desc' });
        
        expect(res.statusCode).toBe(201);
        app1Id = res.body.application.id;
    });

    it('5. Shared application isolation (User 2 sees nothing yet)', async () => {
        const res = await request(app)
            .get('/api/users/me/shared-applications')
            .set('Authorization', `Bearer ${user2Token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.applications).toHaveLength(0);
    });

    it('6. User 1 invites User 2 as VIEWER', async () => {
        // We need an application token for User 1 first
        const ssoRes = await request(app)
            .post(`/api/applications/${app1Id}/auth/sso`)
            .set('Authorization', `Bearer ${user1Token}`);
        
        const appToken = ssoRes.body.token;

        const inviteRes = await request(app)
            .post(`/api/applications/${app1Id}/users`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({ email: 'user2-portal@test.com', role: 'VIEWER' });
        
        expect(inviteRes.statusCode).toBe(201);
        expect(inviteRes.body.membership.role).toBe('VIEWER');
    });

    it('7. Authenticated /me behavior shows shared app for User 2', async () => {
        const res = await request(app)
            .get('/api/users/me/shared-applications')
            .set('Authorization', `Bearer ${user2Token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.applications).toHaveLength(1);
        expect(res.body.applications[0].id).toBe(app1Id);
        expect(res.body.applications[0].user_role).toBe('VIEWER');
    });

    it('8. Role preservation and unauthorized application access (User 2 cannot invite others)', async () => {
        const ssoRes = await request(app)
            .post(`/api/applications/${app1Id}/auth/sso`)
            .set('Authorization', `Bearer ${user2Token}`);
        
        const appToken2 = ssoRes.body.token;

        const inviteRes = await request(app)
            .post(`/api/applications/${app1Id}/users`)
            .set('Authorization', `Bearer ${appToken2}`)
            .send({ email: 'admin-portal@test.com', role: 'ADMIN' });
        
        expect(inviteRes.statusCode).toBe(403);
    });

    it('9. Cross-user access attempts (User 2 cannot access workspace endpoint directly)', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${workspace1Id}`)
            .set('Authorization', `Bearer ${user2Token}`);
        
        expect(res.statusCode).toBe(404); // Returns 404 if not found in their own workspaces
    });
});
