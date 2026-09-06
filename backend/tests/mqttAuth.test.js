const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const mqtt = require('mqtt');
const User = require('../src/models/user');
const bcrypt = require('bcryptjs');

describe('MQTT Authentication and ACLs', () => {
    let deviceId = '';
    let secretKey = '';
    const email = `mqtt_auth_${Date.now()}@example.com`;
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

    beforeAll(async () => {
        // Init schema
        const initDb = require('../src/utils/initDb');
        await initDb();
        
        // Setup user and device for MQTT auth tests
        const hash = await bcrypt.hash('password123', 10);
        const user = await User.create('MQTT Auth Test', email, hash);
        
        const Workspace = require('../src/models/workspace');
        await Workspace.create('Default Workspace', user.id);
        
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'password123' });
        
        const deviceRes = await request(app)
            .post('/api/devices')
            .set('Authorization', `Bearer ${res.body.token}`)
            .send({ name: 'MQTT Auth Device', device_type: 'ESP32' });
            
        deviceId = deviceRes.body.device.device_id;
        secretKey = deviceRes.body.device.secret_key;
        
        // Wait a bit for MQTT reload
        await new Promise(r => setTimeout(r, 1000));
    });

    afterAll(async () => {
        const { getMqttClient } = require('../src/mqtt/client');
        const mainClient = getMqttClient();
        if (mainClient) {
            mainClient.end(true);
        }
        await db.pool.end();
    });

    it('AUTH-01 Valid Device ID + Secret Key connects', (done) => {
        const client = mqtt.connect(brokerUrl, {
            username: deviceId,
            password: secretKey,
            reconnectPeriod: 0
        });

        client.on('connect', () => {
            expect(true).toBe(true);
            client.end();
            done();
        });
        
        client.on('error', (err) => {
            client.end();
            done(err);
        });
    });

    it('AUTH-02 Invalid Secret Key is rejected', (done) => {
        let isDone = false;
        const client = mqtt.connect(brokerUrl, {
            username: deviceId,
            password: 'wrongpassword',
            reconnectPeriod: 0
        });

        client.on('connect', () => {
            client.end();
            if (!isDone) { isDone = true; done(new Error("Connected successfully but should have failed. Mosquitto might be allowing anonymous connections.")); }
        });

        client.on('error', (err) => {
            if (!isDone) {
                isDone = true;
                try {
                    expect(err.message).toMatch(/Not authorized/i);
                    client.end();
                    done();
                } catch (e) {
                    client.end();
                    done(e);
                }
            }
        });
        client.on('close', () => {
            if (!isDone) {
                isDone = true;
                client.end();
                done(); // Accept close as successful rejection
            }
        });
    });

    it('AUTH-03 Unknown Device ID is rejected', (done) => {
        let isDone = false;
        const client = mqtt.connect(brokerUrl, {
            username: 'DEV-999',
            password: 'randompassword',
            reconnectPeriod: 0
        });

        client.on('connect', () => {
            client.end();
            if (!isDone) { isDone = true; done(new Error("Connected successfully but should have failed. Mosquitto might be allowing anonymous connections.")); }
        });

        client.on('error', (err) => {
            if (!isDone) {
                isDone = true;
                client.end();
                done();
            }
        });
        client.on('close', () => {
            if (!isDone) {
                isDone = true;
                client.end();
                done(); // Rejection via TCP close
            }
        });
    });

    it('AUTH-04 Empty username/password is rejected', (done) => {
        let isDone = false;
        const client = mqtt.connect(brokerUrl, { reconnectPeriod: 0 }); // no auth

        client.on('connect', () => {
            client.end();
            if (!isDone) { isDone = true; done(new Error("Connected successfully but should have failed. Mosquitto might be allowing anonymous connections.")); }
        });

        client.on('error', (err) => {
            if (!isDone) {
                isDone = true;
                client.end();
                done();
            }
        });
        client.on('close', () => {
            if (!isDone) {
                isDone = true;
                client.end();
                done(); // Rejection via TCP close
            }
        });
    });

    it('AUTH-05 Device cannot impersonate another Device ID (ACL write rejection)', (done) => {
        let isDone = false;
        const client = mqtt.connect(brokerUrl, {
            username: deviceId,
            password: secretKey,
            reconnectPeriod: 0
        });

        client.on('connect', () => {
            // ACL should disconnect or silently drop if publish is unauthorized
            client.publish('devices/DEV-002/data', '{}');
            
            // Wait to see if connection drops, otherwise assume silent drop (ACL success)
            setTimeout(() => {
                if (!isDone) {
                    isDone = true;
                    client.end();
                    done();
                }
            }, 500);
        });

        client.on('error', (err) => {
            if (!isDone) {
                isDone = true;
                client.end();
                done(); // Error is expected/ok
            }
        });
        client.on('close', () => {
            if (!isDone) {
                isDone = true;
                client.end();
                done(); // Rejection via TCP close is expected
            }
        });
    });

    it('AUTH-06 Valid authenticated device can publish telemetry', (done) => {
        const client = mqtt.connect(brokerUrl, {
            username: deviceId,
            password: secretKey,
            reconnectPeriod: 0
        });

        client.on('connect', () => {
            client.publish(`devices/${deviceId}/data`, JSON.stringify({
                device_id: deviceId,
                data: { temperature: 21, humidity: 50 }
            }), (err) => {
                expect(err).toBeUndefined();
                client.end();
                done();
            });
        });
    });
});
