const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

class MqttProvisioner {
    constructor() {
        this.pwdPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.passwd');
        this.aclPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.acl');
    }

    /**
     * Call this on backend startup. It guarantees the backend's master
     * credentials are in the password file before the MQTT client connects.
     */
    async ensureBackendAccess() {
        const mqttUser = process.env.MQTT_USERNAME || 'backend_admin';
        const mqttPass = process.env.MQTT_PASSWORD || 'super_secret_backend';

        try {
            // Ensure the password file exists natively
            if (!fs.existsSync(this.pwdPath)) {
                fs.writeFileSync(this.pwdPath, '', 'utf8');
                try {
                    execSync(`sudo chmod 666 ${this.pwdPath}`);
                } catch(e) {}
            }

            // Always explicitly add/update the backend user password
            this._runPasswdCommand(`-b ${this.pwdPath} ${mqttUser} ${mqttPass}`);
            
            // Ensure ACL has the backend user
            await this.regenerateACL();
            
            // Reload broker to apply
            this.reloadMosquitto();
            
            console.log(`[MQTT_PROVISION] Backend access secured for user: ${mqttUser}`);
        } catch (error) {
            console.error(`[MQTT_PROVISION] Warning: Failed to secure backend access. Mosquitto may reject connection.`, error.message);
        }
    }

    /**
     * Add or update a device's credentials
     */
    async syncDeviceCredential(deviceId, secretKey) {
        try {
            this._runPasswdCommand(`-b ${this.pwdPath} ${deviceId} ${secretKey}`);
            await this.regenerateACL();
            this.reloadMosquitto();
        } catch (error) {
            console.error("Failed to sync device credential:", error.message);
            throw new Error("MQTT Provisioning Failed");
        }
    }

    /**
     * Remove a device's credentials
     */
    async removeDeviceCredential(deviceId) {
        try {
            this._runPasswdCommand(`-D ${this.pwdPath} ${deviceId}`);
            await this.regenerateACL();
            this.reloadMosquitto();
        } catch (error) {
            console.error("Failed to remove device credential:", error.message);
            // Continue even if deletion fails to not break main flow
        }
    }

    /**
     * Regenerate the entire ACL file from the database
     */
    async regenerateACL() {
        const mqttUser = process.env.MQTT_USERNAME || 'backend_admin';
        let aclContent = `user ${mqttUser}\ntopic readwrite #\n\n`;

        try {
            // Fetch all devices from DB
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

            fs.writeFileSync(this.aclPath, aclContent, 'utf8');
        } catch (error) {
            console.error("Failed to regenerate ACL:", error.message);
            // Fallback: at least write the backend user if DB fails
            fs.writeFileSync(this.aclPath, aclContent, 'utf8');
        }
    }

    /**
     * Reload the Mosquitto broker to pick up password/ACL changes
     */
    reloadMosquitto() {
        try {
            try {
                execSync('docker exec mqtt_broker kill -HUP 1 2>/dev/null');
            } catch(e) {
                execSync('sudo pkill -HUP mosquitto');
            }
        } catch (error) {
            console.error("Failed to reload Mosquitto via SIGHUP:", error.message);
        }
    }

    /**
     * Helper to safely execute mosquitto_passwd in either docker or natively
     */
    _runPasswdCommand(args) {
        try {
            execSync(`docker exec mqtt_broker mosquitto_passwd ${args} 2>/dev/null`);
        } catch (dockerErr) {
            execSync(`sudo mosquitto_passwd ${args}`);
        }
    }
}

module.exports = new MqttProvisioner();
