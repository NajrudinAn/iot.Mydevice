const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mydevice.in:1883', {
    username: 'DEV-001-ADD5',
    password: 'afda7cc10f360a37f201f851999565fc3ab5a3d7857ab9adb1af6fba1a5a9980'
});
client.on('connect', () => {
    console.log("✅ SUCCESS! Connected via mydevice.in");
    process.exit(0);
});
client.on('error', (err) => {
    console.log("❌ FAILED! " + err.message);
    process.exit(1);
});
