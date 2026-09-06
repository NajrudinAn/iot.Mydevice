const { Client } = require('pg');

async function testFilter() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/iot_platform'
    });
    await client.connect();

    try {
        const workspaceRes = await client.query('SELECT id FROM workspaces LIMIT 1');
        if (workspaceRes.rows.length === 0) {
            console.log("No workspaces found");
            return;
        }
        const workspaceId = workspaceRes.rows[0].id;
        
        const deviceRes = await client.query('SELECT device_id FROM devices WHERE workspace_id = $1 LIMIT 1', [workspaceId]);
        if (deviceRes.rows.length === 0) {
            console.log("No devices found");
            return;
        }
        const deviceId = deviceRes.rows[0].device_id;
        
        const SensorData = require('./backend/src/models/sensorData.js');
        
        const now = new Date();
        const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
        const end = now.toISOString();

        const data = await SensorData.getWorkspaceData(workspaceId, {
            deviceId: deviceId,
            start: start,
            end: end,
            limit: 5
        });

        console.log("Filter success! Found records:", data.total);
        if (data.records.length > 0) {
            console.log("Sample record recorded_at:", data.records[0].recorded_at);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
testFilter();
