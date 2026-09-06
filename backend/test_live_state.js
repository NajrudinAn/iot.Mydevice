const { Client } = require('pg');

async function testLiveState() {
    // 1. Get workspace and admin token
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/iot_platform' });
    await client.connect();
    
    try {
        // get the latest workspace
        const wsRes = await client.query('SELECT id, owner_id FROM workspaces ORDER BY created_at DESC LIMIT 1');
        const workspace = wsRes.rows[0];
        
        // get a device
        const devRes = await client.query('SELECT device_id FROM devices WHERE workspace_id = $1 ORDER BY created_at ASC', [workspace.id]);
        
        // Dev 0
        const dev0 = devRes.rows[0].device_id;
        // Dev 2 (nested payload)
        const dev2 = devRes.rows[2].device_id;
        
        console.log("Device 0:", dev0);
        console.log("Device 2:", dev2);
        
        // Let's directly call the internal function!
        const SensorData = require('./src/models/sensorData.js');
        const DeviceDataField = require('./src/models/deviceDataField.js');
        
        const fields0 = await DeviceDataField.getByDeviceId(dev0);
        console.log("Fields 0:", fields0.map(f => f.field_name));
        
        const state0 = await SensorData.getDeviceLiveState(dev0, fields0);
        console.log("Live State 0:");
        console.log(JSON.stringify(state0, null, 2));

        const fields2 = await DeviceDataField.getByDeviceId(dev2);
        console.log("Fields 2:", fields2.map(f => f.field_name));
        
        const state2 = await SensorData.getDeviceLiveState(dev2, fields2);
        console.log("Live State 2 (Nested):");
        console.log(JSON.stringify(state2, null, 2));
        
    } catch(e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
testLiveState();
