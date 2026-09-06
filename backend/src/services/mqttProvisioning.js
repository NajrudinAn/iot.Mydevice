const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// This script expects to be run in an environment where Docker is available
// and the mosquitto/config folder is mapped to the project root.

const syncDeviceCredential = async (deviceId, secretKey) => {
    try {
        // 1. Update mosquitto.passwd
        // Support both docker and local execution
        try {
            execSync(`docker exec mqtt_broker mosquitto_passwd -b /mosquitto/config/mosquitto.passwd ${deviceId} ${secretKey} 2>/dev/null`);
        } catch (dockerErr) {
            const pwdPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.passwd');
            execSync(`sudo mosquitto_passwd -b ${pwdPath} ${deviceId} ${secretKey}`);
        }

        // 2. Regenerate ACL
        await regenerateACL();

        // 3. Reload Mosquitto
        reloadMosquitto();
    } catch (error) {
        console.error("Failed to sync device credential:", error.message);
        throw new Error("MQTT Provisioning Failed");
    }
};

const removeDeviceCredential = async (deviceId) => {
    try {
        try {
            execSync(`docker exec mqtt_broker mosquitto_passwd -D /mosquitto/config/mosquitto.passwd ${deviceId} 2>/dev/null`);
        } catch (dockerErr) {
            const pwdPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.passwd');
            // Use sudo to avoid permission denied on native linux installations
            execSync(`sudo mosquitto_passwd -D ${pwdPath} ${deviceId}`);
        }
        
        await regenerateACL();
        reloadMosquitto();
    } catch (error) {
        console.error("Failed to remove device credential:", error.message);
        // Continue even if deletion fails to not break main flow
    }
};

const regenerateACL = async () => {
    // We always keep backend_admin with # access
    let aclContent = `user backend_admin\ntopic readwrite #\n\n`;

    // Fetch all devices
    const query = `SELECT device_id FROM devices`;
    const result = await db.query(query);

    result.rows.forEach(row => {
        const dId = row.device_id;
        aclContent += `user ${dId}\n`;
        aclContent += `topic read devices/${dId}/command\n`;
        aclContent += `topic write devices/${dId}/data\n`;
        aclContent += `topic write devices/${dId}/status\n`;
        aclContent += `topic write devices/${dId}/capabilities\n`;
        aclContent += `topic write devices/${dId}/command/ack\n\n`;
    });

    // Write to acl file locally (since it's volume mapped)
    const aclPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.acl');
    fs.writeFileSync(aclPath, aclContent, 'utf8');
};

const reloadMosquitto = () => {
    try {
        try {
            execSync('docker exec mqtt_broker kill -HUP 1 2>/dev/null');
        } catch(e) {
            execSync('sudo pkill -HUP mosquitto');
        }
    } catch (error) {
        console.error("Failed to reload Mosquitto via SIGHUP:", error.message);
    }
};

module.exports = { syncDeviceCredential, removeDeviceCredential, regenerateACL };
