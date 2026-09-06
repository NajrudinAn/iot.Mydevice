const request = require('supertest');
const app = require('./src/index');
const db = require('./src/config/db');
const sseEmitter = require('./src/services/sseEmitter');

async function run() {
    console.log("Initial listeners:", sseEmitter.eventNames().map(e => `${e}: ${sseEmitter.listenerCount(e)}`));
    
    // Register user and get token
    const userRes = await request(app).post('/api/auth/register').send({
        email: `sse_test_${Date.now()}@example.com`,
        password: 'password123',
        name: 'SSE Test User'
    });
    
    if (userRes.statusCode !== 201) {
        console.error("Failed to register:", userRes.body);
        process.exit(1);
    }
    
    const loginRes = await request(app).post('/api/auth/login').send({
        email: userRes.body.user.email,
        password: 'password123'
    });
    
    const token = loginRes.body.token;
    
    // Create workspace
    const wsRes = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${token}`).send({
        name: 'SSE Workspace',
        slug: `sse-ws-${Date.now()}`
    });
    const workspaceId = wsRes.body.workspace.id;
    
    console.log(`Created workspace ${workspaceId}`);
    
    // Test SSE connections
    for (let i = 0; i < 50; i++) {
        const req = request(app).get(`/api/workspaces/${workspaceId}/devices/live-status`).set('Authorization', `Bearer ${token}`);
        
        // Connect and abort
        const conn = req.end((err, res) => {
            // just to end
        });
        
        // Wait for it to connect
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Abort request
        conn.abort();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Final listeners:");
    const finalListeners = sseEmitter.eventNames().map(e => `${e}: ${sseEmitter.listenerCount(e)}`);
    console.log(finalListeners);
    
    if (finalListeners.some(l => parseInt(l.split(': ')[1]) > 0)) {
        console.error("LEAK DETECTED!");
        process.exit(1);
    } else {
        console.log("No SSE leaks detected on disconnect.");
        process.exit(0);
    }
}

run().catch(console.error);
