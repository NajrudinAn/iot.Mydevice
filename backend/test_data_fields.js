const db = require('./src/config/db');
const dataController = require('./src/controllers/dataController');
const Device = require('./src/models/device');
const DeviceDataField = require('./src/models/deviceDataField');
const Workspace = require('./src/models/workspace');

async function test() {
    try {
        const deviceId = 'DEV-006-91E0';
        const workspace_id = '743cd5c1-49f3-4033-81f5-b9eb517502e9';
        const userId = '690dfc7b-7ec4-4480-89ab-cbe66293f863'; // from JWT
        
        console.log("Checking workspace...");
        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, userId);
        console.log("Workspace:", workspace);
        
        console.log("Checking device...");
        const isUUID = (str) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
        console.log("Is UUID:", isUUID(deviceId));
        
        const device = isUUID(deviceId) ? await Device.findById(deviceId) : await Device.findByDeviceId(deviceId);
        console.log("Device:", device);
        
        if (!device || device.workspace_id !== workspace_id) {
            console.log("Device missing or mismatch workspace", device?.workspace_id, workspace_id);
        }
        
        console.log("Fetching fields...");
        const fields = await DeviceDataField.getByDeviceId(device.device_id);
        console.log("Fields length:", fields.length);
        
        console.log("All done successfully!");
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}

test();
