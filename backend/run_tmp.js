const request = require('supertest');
const app = require('./src/index');

async function test() {
    const email = `retention_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({ name: 'Retention Owner', email, password: 'password123' });
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const ownerToken = loginRes.body.token;

    const wsRes = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${ownerToken}`);
    const workspaceId = wsRes.body.workspaces[0].id;

    const dev1Res = await request(app)
        .post(`/api/workspaces/${workspaceId}/devices`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Device 1' });
    console.log(dev1Res.body);
    process.exit(0);
}
test();
