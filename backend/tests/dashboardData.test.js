const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

describe('Phase 6K - Dashboard Data Sources & Telemetry', () => {
    let platformToken, appToken, viewerToken;
    let applicationId, dashboardId, pageId, deviceId, dataSourceId;
    let adminId, viewerId;

    beforeAll(async () => {
        // 1. Setup Platform Admin and Workspace
        const userRes = await request(app).post('/api/auth/register').send({
            email: `admin_${Date.now()}@example.com`,
            password: 'password123',
            name: 'Platform Admin'
        });
        
        const loginRes = await request(app).post('/api/auth/login').send({
            email: userRes.body.user.email,
            password: 'password123'
        });
        
        adminId = userRes.body.user.id;
        platformToken = loginRes.body.token;

        const wsRes = await request(app).post('/api/workspaces')
            .set('Authorization', `Bearer ${platformToken}`)
            .send({ name: 'Dashboard Test Workspace', slug: `db-test-${Date.now()}` });
            
        if (!wsRes.body.workspace) {
            console.error('Workspace creation failed:', wsRes.body);
        }
        const workspaceId = wsRes.body.workspace.id;

        // 2. Setup Device
        const devRes = await request(app).post(`/api/workspaces/${workspaceId}/devices`)
            .set('Authorization', `Bearer ${platformToken}`)
            .send({ device_type: 'sensor', name: 'Sensor 1', workspace_id: workspaceId });
        deviceId = devRes.body.device.id;
        const hardwareDeviceId = devRes.body.device.device_id;

        // Add some dummy sensor_data
        await db.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, $2, $3)`, [hardwareDeviceId, 22.5, 45.0]);
        await db.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, $2, $3)`, [hardwareDeviceId, 23.0, 46.0]);

        // 3. Setup Application
        const appRes = await request(app).post(`/api/workspaces/${workspaceId}/applications`)
            .set('Authorization', `Bearer ${platformToken}`)
            .send({ name: 'Data App', slug: `data-app-${Date.now()}` });
        applicationId = appRes.body.application.id;

        // Assign Device
        await request(app).post(`/api/applications/${applicationId}/devices`)
            .set('Authorization', `Bearer ${platformToken}`)
            .send({ device_id: deviceId });

        // Get App Token
        const appLoginRes = await request(app).post(`/api/applications/${applicationId}/auth/login`).send({
            email: userRes.body.user.email,
            password: 'password123'
        });
        appToken = appLoginRes.body.token;

        // 4. Create Dashboard & Page
        const dashRes = await request(app).post(`/api/applications/${applicationId}/dashboards`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({ name: 'Live Dash', slug: 'live-dash', visibility: 'PRIVATE' });
        dashboardId = dashRes.body.dashboard.id;

        const pageRes = await request(app).post(`/api/applications/${applicationId}/dashboards/${dashboardId}/pages`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({ name: 'Main', slug: 'main' });
        pageId = pageRes.body.page.id;
    });

    afterAll(async () => {
        if (db.pool && db.pool.end) {
            await db.pool.end();
        }
    });

    it('should create a dashboard data source securely', async () => {
        const res = await request(app).post(`/api/applications/${applicationId}/data-sources`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({
                name: 'Temp Source',
                source_type: 'DEVICE_TELEMETRY',
                device_id: deviceId,
                data_field: 'temperature',
                query_mode: 'LATEST',
                refresh_interval: 30
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.source.id).toBeDefined();
        dataSourceId = res.body.source.id;
    });

    it('should create a widget using the data source', async () => {
        const res = await request(app).post(`/api/applications/${applicationId}/dashboards/${dashboardId}/pages/${pageId}/widgets`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({
                title: 'Temp Widget',
                widget_type: 'SENSOR_VALUE',
                configuration: { data_source_id: dataSourceId, color: 'blue' }
            });
        expect(res.statusCode).toBe(201);
    });

    it('should fetch dashboard data and successfully retrieve telemetry', async () => {
        const res = await request(app).get(`/api/applications/${applicationId}/dashboards/${dashboardId}/data`)
            .set('Authorization', `Bearer ${appToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.dashboard_id).toBe(dashboardId);
        
        // Find widget data
        const widgetIds = Object.keys(res.body.widgets);
        expect(widgetIds.length).toBe(1);
        
        const widgetData = res.body.widgets[widgetIds[0]];
        expect(widgetData.status).toBe('ok');
        expect(widgetData.data.temperature).toBeDefined();
    });
    
    it('should create a history data source and retrieve array data', async () => {
        const sourceRes = await request(app).post(`/api/applications/${applicationId}/data-sources`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({
                name: 'Temp History',
                source_type: 'DEVICE_TELEMETRY',
                device_id: deviceId,
                data_field: 'temperature',
                query_mode: 'HISTORY',
                time_range: 'LAST_1_HOUR',
                refresh_interval: 30
            });
        const historySourceId = sourceRes.body.source.id;
        
        const widgetRes = await request(app).post(`/api/applications/${applicationId}/dashboards/${dashboardId}/pages/${pageId}/widgets`)
            .set('Authorization', `Bearer ${appToken}`)
            .send({
                title: 'Temp History Chart',
                widget_type: 'LINE_CHART',
                configuration: { data_source_id: historySourceId }
            });
            
        const widgetId = widgetRes.body.widget.id;
        
        const res = await request(app).get(`/api/applications/${applicationId}/dashboards/${dashboardId}/data`)
            .set('Authorization', `Bearer ${appToken}`);
        
        expect(res.statusCode).toBe(200);
        
        const historyWidgetData = res.body.widgets[widgetId];
        expect(historyWidgetData.status).toBe('ok');
        expect(Array.isArray(historyWidgetData.data)).toBe(true);
        expect(historyWidgetData.data.length).toBeGreaterThan(0);
        expect(historyWidgetData.data[0].temperature).toBeDefined();
    });
});
