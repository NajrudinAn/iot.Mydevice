const mqtt = require('mqtt');
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const User = require('../src/models/user');
const bcrypt = require('bcryptjs');

describe('End-to-End Connector Simulation', () => {
    let deviceId = '';
    let secretKey = '';
    const email = `connector_mock_${Date.now()}@example.com`;
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    let token = '';
    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        
        // Setup user and device
        const hash = await bcrypt.hash('password123', 10);
        const user = await User.create('Connector Test', email, hash);
        
        const Workspace = require('../src/models/workspace');
        const workspace = await Workspace.create('Default Workspace', user.id);
        
        const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
        token = loginRes.body.token;
        
        const deviceRes = await request(app)
            .post(`/api/workspaces/${workspace.id}/devices`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Mock ESP32', device_type: 'ESP32' });
            
        deviceId = deviceRes.body.device.device_id;
        secretKey = deviceRes.body.device.secret_key;
        
        await new Promise(r => setTimeout(r, 1000));
    });

    afterAll(async () => {
        await db.pool.end();
    });

    it('E2E-01 Connector authenticates and publishes telemetry successfully', (done) => {
        // 1. Simulate Connector connect()
        const client = mqtt.connect(brokerUrl, {
            username: deviceId,
            password: secretKey
        });

        client.on('connect', () => {
            // 2. Simulate Connector publishStatus()
            client.publish(`devices/${deviceId}/status`, JSON.stringify({
                device_id: deviceId,
                status: 'ONLINE'
            }));
            
            // 3. Simulate Connector publishData()
            client.publish(`devices/${deviceId}/data`, JSON.stringify({
                device_id: deviceId,
                data: { temperature: 28.5, humidity: 64.0 }
            }));
            
            // Wait briefly for backend to process
            setTimeout(async () => {
                // 4. Verify Backend received and stored it
                const dbRes = await db.query('SELECT * FROM sensor_data WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 1', [deviceId]);
                expect(dbRes.rows.length).toBe(1);
                expect(Number(dbRes.rows[0].temperature)).toBe(28.5);
                
                const statusRes = await db.query('SELECT status FROM devices WHERE device_id = $1', [deviceId]);
                expect(statusRes.rows[0].status).toBe('ONLINE');
                
                client.end();
                done();
            }, 1000);
        });
    }, 10000);
    
    it('E2E-02 Connector receives command successfully', (done) => {
        const client = mqtt.connect(brokerUrl, {
            username: deviceId,
            password: secretKey
        });
        
        client.on('connect', () => {
            // Simulate Connector subscribing to command topic
            client.subscribe(`devices/${deviceId}/command`, (err) => {
                expect(err).toBeNull();
                
                // Backend sends command
                const mqttBackend = require('../src/mqtt/client');
                mqttBackend.publishDeviceCommand(deviceId, { command: 'LED_ON' });
            });
        });
        
        client.on('message', (topic, message) => {
            try {
                expect(topic).toBe(`devices/${deviceId}/command`);
                const payload = JSON.parse(message.toString());
                expect(payload.command).toBe('LED_ON');
                client.end();
                done();
            } catch (err) {
                client.end();
                done(err);
            }
        });
    }, 10000);
});
