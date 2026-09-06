const { execSync } = require('child_process');

async function run() {
  try {
    const BASE_URL = "http://localhost:3000/api";
    const email = `test_${Date.now()}@test.com`;
    
    console.log("Registering user...");
    const resAuth = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Test User", email, password: "password123" })
    });
    const authData = await resAuth.json();
    let token = authData.token;
    
    if (!token) {
        const resLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: "password123" })
        });
        const loginData = await resLogin.json();
        token = loginData.token;
    }
    
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    console.log("Creating workspace...");
    const resWs = await fetch(`${BASE_URL}/workspaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: "My Workspace" })
    });
    const wsData = await resWs.json();
    const workspaceId = wsData.workspace.id;

    console.log("Creating device...");
    const resDev = await fetch(`${BASE_URL}/workspaces/${workspaceId}/devices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: "Test Sensor", device_type: "ESP32" })
    });
    const devData = await resDev.json();
    const deviceId = devData.device.device_id;
    const secretKey = devData.device.secret_key;
    const deviceUuid = devData.device.id;

    console.log(`Created Device: ${deviceId} with Secret: ${secretKey}`);

    console.log("Running simulator...");
    const output = execSync(`python3 ../scripts/test_mqtt_device.py --device-id ${deviceId} --secret-key ${secretKey} --count 3 --interval 1`).toString();
    console.log(output);

    console.log("Checking device status...");
    const resCheck = await fetch(`${BASE_URL}/workspaces/${workspaceId}/devices/${deviceUuid}`, { headers });
    const checkData = await resCheck.json();
    const status = checkData.device.status;
    const lastSeen = checkData.device.last_seen;
    
    console.log(`Backend Device Status: ${status}`);
    console.log(`Backend Last Seen: ${lastSeen}`);

    if (status.toLowerCase() !== 'online') {
        console.error("Status did not update to online!");
        process.exit(1);
    }
    console.log("E2E Test Passed!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
