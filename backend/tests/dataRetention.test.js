const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');
const RetentionService = require('../src/services/retentionService');

describe('Data Retention System', () => {
    let ownerToken, workspaceId, appId1, appId2, deviceId1, deviceId2, deviceId3;

    beforeAll(async () => {
        // Register owner
        const email = `retention_${Date.now()}@test.com`;
        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Retention Owner', email, password: 'password123' });
            
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'password123' });
            
        ownerToken = loginRes.body.token;

        // Get default workspace
        await request(app).post('/api/workspaces').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Default Workspace' });
        
        const wsRes = await request(app)
            .get('/api/workspaces')
            .set('Authorization', `Bearer ${ownerToken}`);
        workspaceId = wsRes.body.workspaces[0].id;

        // Register 2 apps
        const app1Res = await request(app)
            .post(`/api/workspaces/${workspaceId}/applications`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Retention App 1' });
        appId1 = app1Res.body.application.id;

        const app2Res = await request(app)
            .post(`/api/workspaces/${workspaceId}/applications`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Retention App 2' });
        appId2 = app2Res.body.application.id;

        // Register 3 devices in workspace
        const dev1Res = await request(app)
            .post(`/api/workspaces/${workspaceId}/devices`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Device 1', device_type: 'sensor' });
        deviceId1 = dev1Res.body.device.id; // UUID
        const pubDev1 = dev1Res.body.device.device_id; // DEV-... string

        const dev2Res = await request(app)
            .post(`/api/workspaces/${workspaceId}/devices`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Device 2', device_type: 'sensor' });
        deviceId2 = dev2Res.body.device.id;
        const pubDev2 = dev2Res.body.device.device_id;

        const dev3Res = await request(app)
            .post(`/api/workspaces/${workspaceId}/devices`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Device 3', device_type: 'sensor' });
        deviceId3 = dev3Res.body.device.id;
        const pubDev3 = dev3Res.body.device.device_id;

        // Assign Device 1 to App 1
        await request(app).post(`/api/applications/${appId1}/devices`).set('Authorization', `Bearer ${ownerToken}`).send({ device_id: pubDev1 });
        
        // Assign Device 2 to App 1 and App 2
        await request(app).post(`/api/applications/${appId1}/devices`).set('Authorization', `Bearer ${ownerToken}`).send({ device_id: pubDev2 });
        await request(app).post(`/api/applications/${appId2}/devices`).set('Authorization', `Bearer ${ownerToken}`).send({ device_id: pubDev2 });

        // Device 3 remains unassigned

        // Insert historical data using direct DB to manipulate recorded_at
        // Device 1: 10 days old, 2 days old
        // Device 2: 40 days old, 15 days old
        // Device 3: 100 days old

        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity, recorded_at) VALUES 
            ($1, 20.0, 50.0, NOW() - INTERVAL '10 days'),
            ($1, 21.0, 51.0, NOW() - INTERVAL '2 days'),
            ($2, 22.0, 52.0, NOW() - INTERVAL '40 days'),
            ($2, 23.0, 53.0, NOW() - INTERVAL '15 days'),
            ($3, 24.0, 54.0, NOW() - INTERVAL '100 days')
        `, [pubDev1, pubDev2, pubDev3]);
    });

    afterAll(async () => {
        RetentionService.stop();
        await pool.query('DELETE FROM users WHERE email = $1', ['retention@test.com']);
    });

    it('should set retention to 7 days for App 1 and FOREVER for App 2 initially', async () => {
        const res = await request(app)
            .patch(`/api/applications/${appId1}/retention`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ data_retention_days: 7 });
        expect(res.statusCode).toBe(200);
        expect(res.body.application.data_retention_days).toBe(7);

        // App 2 is 0 (Forever) by default
    });

    it('should clean up telemetry based on retention policies safely', async () => {
        // Force cleanup
        await RetentionService.cleanupTelemetry();

        // Device 1 is only in App 1 (7 days) -> The 10-day record should be DELETED, the 2-day record should REMAIN.
        // Device 2 is in App 1 (7 days) and App 2 (Forever) -> ALL records should REMAIN.
        // Device 3 is in no app -> defaults to Forever -> ALL records should REMAIN.

        const dev1Check = await pool.query(`SELECT COUNT(*) FROM sensor_data WHERE device_id = (SELECT device_id FROM devices WHERE id = $1)`, [deviceId1]);
        expect(parseInt(dev1Check.rows[0].count)).toBe(1); // 1 deleted, 1 kept

        const dev2Check = await pool.query(`SELECT COUNT(*) FROM sensor_data WHERE device_id = (SELECT device_id FROM devices WHERE id = $1)`, [deviceId2]);
        expect(parseInt(dev2Check.rows[0].count)).toBe(2); // both kept

        const dev3Check = await pool.query(`SELECT COUNT(*) FROM sensor_data WHERE device_id = (SELECT device_id FROM devices WHERE id = $1)`, [deviceId3]);
        expect(parseInt(dev3Check.rows[0].count)).toBe(1); // kept
    });

    it('should handle shared device intersection properly (7 days + 30 days -> 30 days retained)', async () => {
        // App 2 changes to 30 days
        await request(app)
            .patch(`/api/applications/${appId2}/retention`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ data_retention_days: 30 });

        await RetentionService.cleanupTelemetry();

        // Device 2 is in App 1 (7 days) and App 2 (30 days) -> MAX is 30 days.
        // The 40-day record should be DELETED, the 15-day record should REMAIN.
        const dev2Check = await pool.query(`SELECT COUNT(*) FROM sensor_data WHERE device_id = (SELECT device_id FROM devices WHERE id = $1)`, [deviceId2]);
        expect(parseInt(dev2Check.rows[0].count)).toBe(1); // 1 deleted, 1 kept
    });

    it('should reject invalid retention values', async () => {
        const res = await request(app)
            .patch(`/api/applications/${appId1}/retention`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ data_retention_days: 15 });
        expect(res.statusCode).toBe(400);

        const res2 = await request(app)
            .patch(`/api/applications/${appId1}/retention`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ data_retention_days: -1 });
        expect(res2.statusCode).toBe(400);
    });

    it('should not delete other entities during cleanup', async () => {
        const appCheck = await pool.query(`SELECT COUNT(*) FROM applications WHERE id = $1`, [appId1]);
        expect(parseInt(appCheck.rows[0].count)).toBe(1);

        const devCheck = await pool.query(`SELECT COUNT(*) FROM devices WHERE id = $1`, [deviceId1]);
        expect(parseInt(devCheck.rows[0].count)).toBe(1);

        const wsCheck = await pool.query(`SELECT COUNT(*) FROM workspaces WHERE id = $1`, [workspaceId]);
        expect(parseInt(wsCheck.rows[0].count)).toBe(1);
    });
});
