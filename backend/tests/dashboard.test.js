const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/config/db');

describe('Phase 6G: Custom Application Dashboard Foundation', () => {
    let adminToken, viewerToken;
    let workspaceId, appId, deviceA, deviceB, deviceUnassigned;
    let adminId, viewerId;
    let dashboardId, pageId, widgetId;
    let apiId;

    beforeAll(async () => {
        // Register Admin
        const resAdmin = await request(app).post('/api/auth/register').send({ name: 'Admin 6G', email: 'admin6g@test.com', password: 'password123' });
        adminId = resAdmin.body.user.id;
        adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin6g@test.com', password: 'password123'})).body.token;

        // Register Viewer
        const resViewer = await request(app).post('/api/auth/register').send({ name: 'Viewer 6G', email: 'viewer6g@test.com', password: 'password123' });
        viewerId = resViewer.body.user.id;
        viewerToken = (await request(app).post('/api/auth/login').send({ email: 'viewer6g@test.com', password: 'password123'})).body.token;

        // Create Workspace & App
        const resWs = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${adminToken}`).send({ name: 'WS 6G' });
        workspaceId = resWs.body.workspace.id;
        appId = (await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'App 6G' })).body.application.id;

        // Add Viewer to App
        await request(app).post(`/api/applications/${appId}/users`).set('Authorization', `Bearer ${adminToken}`).send({ email: 'viewer6g@test.com', role: 'VIEWER' });

        // Generate App Tokens 
        const appAuthViewerRes = await request(app).post(`/api/applications/${appId}/auth/login`).send({ email: 'viewer6g@test.com', password: 'password123' });
        if (appAuthViewerRes.status !== 200) console.log('App Login Failed:', appAuthViewerRes.body);
        viewerToken = appAuthViewerRes.body.token || viewerToken;

        // Create Devices
        deviceA = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Dev A 6G', device_type: 'ESP32' })).body.device.id;
        deviceB = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Dev B 6G', device_type: 'ESP32' })).body.device.id;
        deviceUnassigned = (await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Dev Unassigned', device_type: 'ESP32' })).body.device.id;

        await request(app).post(`/api/applications/${appId}/devices`).set('Authorization', `Bearer ${adminToken}`).send({ device_id: deviceA });
        await request(app).post(`/api/applications/${appId}/devices`).set('Authorization', `Bearer ${adminToken}`).send({ device_id: deviceB });

        // Insert Telemetry
        const d_A_ext = (await pool.query('SELECT device_id FROM devices WHERE id = $1', [deviceA])).rows[0].device_id;
        await pool.query(`INSERT INTO sensor_data (device_id, temperature, humidity) VALUES ($1, 26, 52)`, [d_A_ext]);

        // Create an API definition to test Dynamic API sources
        const apiRes = await request(app).post(`/api/applications/${appId}/apis`).set('Authorization', `Bearer ${adminToken}`).send({
            name: 'API 6G', slug: 'api-6g', authentication_required: true
        });
        apiId = apiRes.body.api.id;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
        await pool.query("DELETE FROM users WHERE email IN ('admin6g@test.com', 'viewer6g@test.com')");
        await pool.pool.end();
    });

    it('6G-01: Create dashboard', async () => {
        const res = await request(app).post(`/api/applications/${appId}/dashboards`).set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Main Dashboard', slug: 'main-dash', visibility: 'PRIVATE'
        });
        expect(res.status).toBe(201);
        dashboardId = res.body.dashboard.id;
    });

    it('6G-14: Viewer cannot modify dashboard', async () => {
        const res = await request(app).post(`/api/applications/${appId}/dashboards`).set('Authorization', `Bearer ${viewerToken}`).send({
            name: 'Hacked Dash', slug: 'hack'
        });
        expect(res.status).toBe(403);
    });

    it('6G-06: Create page', async () => {
        const res = await request(app).post(`/api/applications/${appId}/dashboards/${dashboardId}/pages`).set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Overview', slug: 'overview'
        });
        expect(res.status).toBe(201);
        pageId = res.body.page.id;
    });

    it('6G-10: Create widget (Valid)', async () => {
        const res = await request(app).post(`/api/applications/${appId}/dashboards/${dashboardId}/pages/${pageId}/widgets`).set('Authorization', `Bearer ${adminToken}`).send({
            widget_type: 'SENSOR_VALUE',
            title: 'Temp Widget',
            configuration: { source_type: 'APPLICATION_DEVICE', device_id: deviceA, field: 'temperature' }
        });
        expect(res.status).toBe(201);
        widgetId = res.body.widget.id;
    });

    it('6G-20: Widget cannot reference unauthorized device', async () => {
        const res = await request(app).post(`/api/applications/${appId}/dashboards/${dashboardId}/pages/${pageId}/widgets`).set('Authorization', `Bearer ${adminToken}`).send({
            widget_type: 'SENSOR_VALUE', title: 'Hacked Widget',
            configuration: { source_type: 'APPLICATION_DEVICE', device_id: deviceUnassigned, field: 'temperature' }
        });
        expect(res.status).toBe(403);
    });

    it('6G-24: Dashboard retrieves permitted telemetry (Private Auth)', async () => {
        const res = await request(app).get(`/api/applications/${appId}/dashboards/${dashboardId}/view`).set('Authorization', `Bearer ${viewerToken}`);
        if (res.status !== 200) console.log(res.body);
        expect(res.status).toBe(200);
        // Data is now fetched via /data endpoint (Phase 6K), so we just verify the dashboard definition loads successfully
    });

    it('6G-29: Private dashboard requires authentication', async () => {
        const res = await request(app).get(`/api/applications/${appId}/dashboards/${dashboardId}/view`);
        expect(res.status).toBe(401);
    });

    it('6G-28: Public dashboard access works when configured', async () => {
        // Change dashboard to PUBLIC
        await request(app).patch(`/api/applications/${appId}/dashboards/${dashboardId}`).set('Authorization', `Bearer ${adminToken}`).send({ visibility: 'PUBLIC' });

        // Request without ANY token
        const res = await request(app).get(`/api/applications/${appId}/dashboards/${dashboardId}/view`);
        expect(res.status).toBe(200);
        expect(res.body.dashboard.visibility).toBe('PUBLIC');
    });
});
