const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('Phase 6L Advanced Dashboard APIs', () => {
    let token, userId, workspaceId, applicationId, dashboardId, dataSourceId, deviceId1, deviceId2;

    beforeAll(async () => {
        // Setup user, workspace, app
        userId = uuidv4();
        workspaceId = uuidv4();
        applicationId = uuidv4();
        
        token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
        
        await db.query(`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, 'hash', 'Test Admin')`, [userId, `admin_${Date.now()}@test.com`]);
        await db.query(`INSERT INTO workspaces (id, name, owner_id) VALUES ($1, 'Test Workspace', $2)`, [workspaceId, userId]);
        await db.query(`INSERT INTO applications (id, workspace_id, name, slug) VALUES ($1, $2, 'Test App', $3)`, [applicationId, workspaceId, `app-${Date.now()}`]);
        await db.query(`INSERT INTO application_users (application_id, user_id, role, status) VALUES ($1, $2, 'ADMIN', 'ACTIVE')`, [applicationId, userId]);

        // Create devices
        deviceId1 = uuidv4();
        deviceId2 = uuidv4();
        await db.query(`INSERT INTO devices (id, device_id, secret_key, name, device_type, user_id, workspace_id) VALUES ($1, $4, 'sec1', 'Dev 1', 'sensor', $2, $3)`, [deviceId1, userId, workspaceId, `DEV-1-${Date.now()}`]);
        await db.query(`INSERT INTO devices (id, device_id, secret_key, name, device_type, user_id, workspace_id) VALUES ($1, $4, 'sec2', 'Dev 2', 'sensor', $2, $3)`, [deviceId2, userId, workspaceId, `DEV-2-${Date.now()}`]);
        
        await db.query(`INSERT INTO application_devices (application_id, device_id) VALUES ($1, $2)`, [applicationId, deviceId1]);
        await db.query(`INSERT INTO application_devices (application_id, device_id) VALUES ($1, $2)`, [applicationId, deviceId2]);
    });

    afterAll(async () => {
        // Pool end is managed by jest teardown or not needed here if it crashes
    });

    it('should create a multi-device data source', async () => {
        const res = await request(app)
            .post(`/api/applications/${applicationId}/data-sources`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Multi Device Source',
                source_type: 'DEVICE_TELEMETRY',
                device_ids: [deviceId1, deviceId2],
                data_field: 'temperature',
                query_mode: 'LATEST',
                refresh_interval: 30
            });
        
        expect(res.status).toBe(201);
        expect(res.body.source.id).toBeDefined();
        dataSourceId = res.body.source.id;

        // Verify Junction Table
        const dbRes = await db.query(`SELECT * FROM dashboard_data_source_devices WHERE source_id = $1`, [dataSourceId]);
        expect(dbRes.rows.length).toBe(2);
    });

    it('should duplicate a dashboard and its data sources', async () => {
        // Create original dashboard
        const resCreate = await request(app)
            .post(`/api/applications/${applicationId}/dashboards`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Orig Dashboard', slug: 'orig-dash', visibility: 'PRIVATE' });
        
        expect(resCreate.status).toBe(201);
        dashboardId = resCreate.body.dashboard.id;

        // Add page
        const resPage = await request(app)
            .post(`/api/applications/${applicationId}/dashboards/${dashboardId}/pages`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Page 1', slug: 'p1', position: 1 });
        const pageId = resPage.body.page.id;

        // Add widget using data source
        await request(app)
            .post(`/api/applications/${applicationId}/dashboards/${dashboardId}/pages/${pageId}/widgets`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'W1', widget_type: 'LINE_CHART', configuration: { data_source_id: dataSourceId } });

        // Duplicate
        const resDup = await request(app)
            .post(`/api/applications/${applicationId}/dashboards/${dashboardId}/duplicate`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(resDup.status).toBe(201);
        const dupDashboardId = resDup.body.dashboard.id;
        expect(dupDashboardId).not.toBe(dashboardId);
        expect(resDup.body.dashboard.name).toContain('(Copy)');

        // Activate the duplicated dashboard so we can view it
        await request(app)
            .patch(`/api/applications/${applicationId}/dashboards/${dupDashboardId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'ACTIVE' });

        // Fetch the duplicated dashboard
        const viewRes = await request(app)
            .get(`/api/applications/${applicationId}/dashboards/${dupDashboardId}/view`)
            .set('Authorization', `Bearer ${token}`);
        
        const dupWidget = viewRes.body.pages[0].widgets[0];
        expect(dupWidget.configuration.data_source_id).toBeDefined();
        expect(dupWidget.configuration.data_source_id).not.toBe(dataSourceId);
    });
});
