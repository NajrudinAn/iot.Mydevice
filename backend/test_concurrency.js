const request = require('supertest');
const app = require('./src/index');
const pool = require('./src/config/db');

async function testConcurrency() {
    let successCount = 0;
    let authFailCount = 0;
    let otherErrorCount = 0;

    console.log('--- Setting up Concurrency Test ---');
    const rand = Math.random().toString(36).substring(7);
    const adminEmail = `admin_conc_${rand}@test.com`;
    const adminRes = await request(app).post('/api/auth/register').send({ name: 'Admin Conc', email: adminEmail, password: 'password123' });
    const adminToken = adminRes.body.token || (await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'password123' })).body.token;

    const wsId = (await request(app).post('/api/workspaces').set('Authorization', 'Bearer ' + adminToken).send({ name: 'Conc WS' })).body.workspace.id;
    const appId = (await request(app).post(`/api/workspaces/${wsId}/applications`).set('Authorization', 'Bearer ' + adminToken).send({ name: 'Conc App' })).body.application.id;

    // 2. Create Public Dashboard
    const dashPubId = (await request(app).post(`/api/applications/${appId}/dashboards`).set('Authorization', 'Bearer ' + adminToken).send({ name: 'Pub Dash', slug: 'pub-dash', visibility: 'PUBLIC' })).body.dashboard.id;
    
    // 3. Create Private Dashboard
    const dashPrivId = (await request(app).post(`/api/applications/${appId}/dashboards`).set('Authorization', 'Bearer ' + adminToken).send({ name: 'Priv Dash', slug: 'priv-dash', visibility: 'PRIVATE' })).body.dashboard.id;

    // 4. Create multiple users
    const users = [];
    for (let i = 0; i < 5; i++) {
        const uEmail = `user_conc_${rand}_${i}@test.com`;
        const uRes = await request(app).post('/api/auth/register').send({ name: 'User '+i, email: uEmail, password: 'password123' });
        const token = uRes.body.token || (await request(app).post('/api/auth/login').send({ email: uEmail, password: 'password123' })).body.token;
        
        // Add half of them to the application as VIEWERS
        if (i < 3) {
            await request(app).post(`/api/applications/${appId}/users`).set('Authorization', 'Bearer ' + adminToken).send({ email: uEmail, role: 'VIEWER' });
        }
        
        // Login application user
        const appTokenRes = await request(app).post(`/api/applications/${appId}/auth/login`).send({ email: uEmail, password: 'password123' });
        users.push({ id: i, inApp: i < 3, token: appTokenRes.body.token || token });
    }

    console.log('--- Running Concurrency Test (50 Requests) ---');
    const promises = [];
    for (let i = 0; i < 50; i++) {
        const u = users[Math.floor(Math.random() * users.length)];
        const isPublicRequest = Math.random() > 0.5;
        const dashId = isPublicRequest ? dashPubId : dashPrivId;
        const sendToken = Math.random() > 0.2; // 80% chance to send a token
        
        const req = request(app).get(`/api/applications/${appId}/dashboards/${dashId}/view`);
        if (sendToken && u.token) {
            req.set('Authorization', 'Bearer ' + u.token);
        }

        promises.push(req.then(res => {
            if (res.status === 200) {
                successCount++;
            } else if (res.status === 401 || res.status === 403) {
                authFailCount++;
            } else {
                otherErrorCount++;
                console.log(`Unexpected error: ${res.status}`, res.body);
            }
        }).catch(err => {
            otherErrorCount++;
            console.error('Request error:', err);
        }));
    }

    await Promise.all(promises);

    console.log(`Success: ${successCount}`);
    console.log(`Auth Failures: ${authFailCount}`);
    console.log(`Other Errors: ${otherErrorCount}`);

    await pool.pool.end();
}

testConcurrency();
