const request = require('supertest');
const app = require('../src/index');

const db = require('../src/config/db');

// We need users and tokens
let userAToken, userBToken;
let userAId, userBId;
let userADefaultWorkspaceId;

beforeAll(async () => {
    const initDb = require('../src/utils/initDb');
    await initDb();
    await db.query(`DELETE FROM users WHERE email IN ('usera@workspace.com', 'userb@workspace.com')`);

    // 1. Register User A
    const resA = await request(app).post('/api/auth/register').send({
        name: 'User A',
        email: 'usera@workspace.com',
        password: 'password123'
    });
    userAId = resA.body.user.id;

    const loginA = await request(app).post('/api/auth/login').send({
        email: 'usera@workspace.com',
        password: 'password123'
    });
    userAToken = loginA.body.token;

    // 2. Register User B
    const resB = await request(app).post('/api/auth/register').send({
        name: 'User B',
        email: 'userb@workspace.com',
        password: 'password123'
    });
    userBId = resB.body.user.id;

    const loginB = await request(app).post('/api/auth/login').send({
        email: 'userb@workspace.com',
        password: 'password123'
    });
    userBToken = loginB.body.token;
});



afterAll(async () => {
    await db.pool.end();
});

describe('Workspace APIs', () => {
    
    it('User A has 0 workspaces initially', async () => {
        const res = await request(app)
            .get('/api/workspaces')
            .set('Authorization', `Bearer ${userAToken}`);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.workspaces.length).toBe(0);
        
        // Explicitly create a workspace for User A
        const createRes = await request(app)
            .post('/api/workspaces')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ name: 'Default Workspace' });
            
        expect(createRes.statusCode).toBe(201);
        userADefaultWorkspaceId = createRes.body.workspace.id;
    });

    it('User A can create a new workspace', async () => {
        const res = await request(app)
            .post('/api/workspaces')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ name: 'Factory Floor 1' });
            
        expect(res.statusCode).toBe(201);
        expect(res.body.workspace.name).toBe('Factory Floor 1');
        expect(res.body.workspace.owner_id).toBe(userAId);
    });

    it('User B cannot see User A workspaces', async () => {
        // User B fetches their workspaces
        const resB = await request(app)
            .get('/api/workspaces')
            .set('Authorization', `Bearer ${userBToken}`);
            
        expect(resB.body.workspaces.length).toBe(0); // None initially
        if (resB.body.workspaces.length > 0) {
           expect(resB.body.workspaces[0].id).not.toBe(userADefaultWorkspaceId);
        }
    });

    it('User B cannot fetch User A workspace by ID', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${userADefaultWorkspaceId}`)
            .set('Authorization', `Bearer ${userBToken}`);
            
        expect(res.statusCode).toBe(404);
    });
});

describe('Workspace Device Association', () => {
    it('User A can register a device to their workspace explicitly', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${userADefaultWorkspaceId}/devices`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ name: 'Pump 1', device_type: 'ESP32' });
            
        expect(res.statusCode).toBe(201);
        expect(res.body.device.workspace_id).toBe(userADefaultWorkspaceId);
    });

    it('User B CANNOT register a device to User A workspace', async () => {
        const res = await request(app)
            .post(`/api/workspaces/${userADefaultWorkspaceId}/devices`)
            .set('Authorization', `Bearer ${userBToken}`)
            .send({ name: 'Hacked Pump', device_type: 'ESP32' });
            
        expect(res.statusCode).toBe(403);
    });

    it('User A can list devices in their workspace', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${userADefaultWorkspaceId}/devices`)
            .set('Authorization', `Bearer ${userAToken}`);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.devices.length).toBeGreaterThanOrEqual(1);
    });

    it('User B CANNOT list devices in User A workspace', async () => {
        const res = await request(app)
            .get(`/api/workspaces/${userADefaultWorkspaceId}/devices`)
            .set('Authorization', `Bearer ${userBToken}`);
            
        expect(res.statusCode).toBe(403);
    });

    it('Backward compatibility: POST /api/devices uses default workspace', async () => {
        const res = await request(app)
            .post('/api/devices')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ name: 'Temp Sensor', device_type: 'DHT22' });
            
        expect(res.statusCode).toBe(201);
        expect(res.body.device.workspace_id).toBe(userADefaultWorkspaceId);
    });
});
