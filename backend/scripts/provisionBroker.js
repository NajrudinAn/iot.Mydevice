const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MqttProvisioner = require('../src/services/MqttProvisioner');

async function main() {
    console.log("Starting MQTT Broker provisioning...");
    try {
        await MqttProvisioner.provisionMasterCredentials();
        console.log("Provisioning completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Provisioning failed:", err);
        process.exit(1);
    }
}

main();
