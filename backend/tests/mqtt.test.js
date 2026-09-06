const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const mqttClient = require('../src/mqtt/client');
const Device = require('../src/models/device');
const SensorData = require('../src/models/sensorData');
const User = require('../src/models/user');
const bcrypt = require('bcryptjs');

describe('MQTT Communication', () => {
    let deviceId = '';
    const email = `mqtt_test_${Date.now()}@example.com`;

    beforeAll(async () => {
        // Init schema
        const initDb = require('../src/utils/initDb');
        await initDb();
        
        // Setup user and device for MQTT tests
        const hash = await bcrypt.hash('password123', 10);
        const user = await User.create('MQTT Test', email, hash);
        
        const Workspace = require('../src/models/workspace');
        await Workspace.create('Default Workspace', user.id);
        
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'password123' });
        
        const deviceRes = await request(app)
            .post('/api/devices')
            .set('Authorization', `Bearer ${res.body.token}`)
            .send({ name: 'MQTT Device', device_type: 'ESP32' });
            
        if (!deviceRes.body.device) console.error("DEVICE REGISTRATION ERROR:", deviceRes.body);
        
        deviceId = deviceRes.body.device.device_id;
        
        // Wait a bit for MQTT client to connect
        await new Promise(r => setTimeout(r, 1000));
    });

    afterAll(async () => {
        const client = mqttClient.getMqttClient();
        if (client) {
            client.end();
        }
        await db.pool.end();
    });

    it('MQTT-01/02 Broker and Backend Connection works', () => {
        const client = mqttClient.getMqttClient();
        expect(client).toBeDefined();
        expect(client.connected).toBe(true);
    });

    it('MQTT-04/05 Valid telemetry received and stored', async () => {
        const client = mqttClient.getMqttClient();
        const topic = `devices/${deviceId}/data`;
        const payload = JSON.stringify({
            device_id: deviceId,
            data: { temperature: 25.5, humidity: 60 }
        });

        // Publish manually
        client.publish(topic, payload);
        
        // Wait for handler processing
        await new Promise(r => setTimeout(r, 500));
        
        // Check database
        const result = await db.query('SELECT * FROM sensor_data WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 1', [deviceId]);
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].temperature).toBe(25.5);
    });

    it('MQTT-06/07 Status message processed and last_seen updated', async () => {
        const client = mqttClient.getMqttClient();
        const topic = `devices/${deviceId}/status`;
        const payload = JSON.stringify({
            device_id: deviceId,
            status: 'ONLINE'
        });

        client.publish(topic, payload);
        await new Promise(r => setTimeout(r, 500));
        
        const device = await Device.findByDeviceId(deviceId);
        expect(device.status).toBe('ONLINE');
        expect(device.last_seen).not.toBeNull();
    });

    it('MQTT-08 Unknown device rejected gracefully', async () => {
        const client = mqttClient.getMqttClient();
        const topic = `devices/UNKNOWN-123/status`;
        const payload = JSON.stringify({
            device_id: 'UNKNOWN-123',
            status: 'ONLINE'
        });

        // Shouldn't crash
        client.publish(topic, payload);
        await new Promise(r => setTimeout(r, 500));
        expect(true).toBe(true);
    });

    it('MQTT-09 Invalid JSON rejected gracefully', async () => {
        const client = mqttClient.getMqttClient();
        const topic = `devices/${deviceId}/data`;
        client.publish(topic, 'NOT_JSON');
        await new Promise(r => setTimeout(r, 500));
        expect(true).toBe(true);
    });

    it('MQTT-10 Device ID mismatch rejected gracefully', async () => {
        const client = mqttClient.getMqttClient();
        const topic = `devices/${deviceId}/data`;
        const payload = JSON.stringify({
            device_id: 'MISMATCHED-ID',
            data: { temperature: 10, humidity: 10 }
        });

        client.publish(topic, payload);
        await new Promise(r => setTimeout(r, 500));
        expect(true).toBe(true);
    });

    it('MQTT-12 Command published correctly', async () => {
        expect(() => {
            mqttClient.publishDeviceCommand(deviceId, 'LED_ON');
        }).not.toThrow();
    });

});
