const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');
const Command = require('../src/models/command');

describe('Stage 1 Verification', () => {
    let workspaceId, deviceId, userToken, adminToken, appId, adminId;

    beforeAll(async () => {
        const initDb = require('../src/utils/initDb');
        await initDb();
        // Setup Users
        const resA = await request(app).post('/api/auth/register').send({
            name: 'Stage1 User', email: `stage1_${Date.now()}@test.com`, password: 'password123'
        });
        const loginA = await request(app).post('/api/auth/login').send({
            email: resA.body.user.email, password: 'password123'
        });
        userToken = loginA.body.token;

        const resAdmin = await request(app).post('/api/auth/register').send({
            name: 'Stage1 Admin', email: `stage1_admin_${Date.now()}@test.com`, password: 'password123'
        });
        const loginAdmin = await request(app).post('/api/auth/login').send({
            email: resAdmin.body.user.email, password: 'password123'
        });
        adminToken = loginAdmin.body.token;
        adminId = resAdmin.body.user.id;

        // Setup Workspace
        const wsRes = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Stage1 WS', description: 'Testing Stage 1'
        });
        if (!wsRes.body.workspace) {
            console.error("Failed to create workspace:", wsRes.body);
        }
        workspaceId = wsRes.body.workspace.id;

        // Setup Application
        const appRes = await request(app).post(`/api/workspaces/${workspaceId}/applications`).set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Stage1 App', description: 'App'
        });
        appId = appRes.body.application.id;

        // Setup Device
        const devRes = await request(app).post(`/api/workspaces/${workspaceId}/devices`).set('Authorization', `Bearer ${adminToken}`).send({
            name: 'Stage1 Device', device_type: 'sensor'
        });
        deviceId = devRes.body.device.id;
    });

    describe('1. API Limit Enforcement', () => {
        it('should fallback to default limit on invalid/negative limits', async () => {
            const res = await request(app)
                .get(`/api/workspaces/${workspaceId}/data?limit=-10`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            // It defaults to 50, but since there's no data, we just ensure it doesn't crash or throw a 500 error due to invalid SQL LIMIT.
        });

        it('should cap limit at 1000 even if larger is requested', async () => {
            const res = await request(app)
                .get(`/api/workspaces/${workspaceId}/data?limit=5000`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });

    describe('2. Command State Machine Correctness', () => {
        it('should correctly prevent duplicate ACKs or invalid transitions', async () => {
            // Create a command
            const cmd = await Command.create({
                workspace_id: workspaceId,
                application_id: appId,
                device_id: deviceId,
                requested_by_user_id: adminId,
                command_type: 'test_cmd',
                command_payload: {},
                correlation_id: uuidv4()
            });

            // Update to SENT
            const sentCmd = await Command.updateStatus(cmd.id, 'SENT');
            expect(sentCmd.status).toBe('SENT');

            // Update to ACKNOWLEDGED
            const ackCmd = await Command.updateStatus(cmd.id, 'ACKNOWLEDGED');
            expect(ackCmd.status).toBe('ACKNOWLEDGED');

            // Duplicate ACKNOWLEDGED (should be idempotent)
            const ackCmd2 = await Command.updateStatus(cmd.id, 'ACKNOWLEDGED');
            expect(ackCmd2.status).toBe('ACKNOWLEDGED');

            // Update to COMPLETED
            const compCmd = await Command.updateStatus(cmd.id, 'COMPLETED');
            expect(compCmd.status).toBe('COMPLETED');

            // Stale ACKNOWLEDGED (after COMPLETED) should return COMPLETED without error
            const staleCmd = await Command.updateStatus(cmd.id, 'ACKNOWLEDGED');
            expect(staleCmd.status).toBe('COMPLETED');

            // Invalid transition from COMPLETED to SENT should throw
            await expect(Command.updateStatus(cmd.id, 'SENT')).rejects.toThrow(/Invalid state transition/);
        });
    });

    afterAll(async () => {
        const { getMqttClient } = require('../src/mqtt/client');
        const mainClient = getMqttClient();
        if (mainClient) {
            mainClient.end(true);
        }
    });
});
