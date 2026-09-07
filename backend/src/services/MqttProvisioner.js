const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MqttProvisioner {
    constructor() {
        this.pwdPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.passwd');
        this.aclPath = path.join(__dirname, '../../../mosquitto/config/mosquitto.acl');
    }

    /**
     * Call this on backend startup. It guarantees the master
     * credentials are in the password file before the MQTT client connects.
     */
    async ensureBackendAccess() {
        const mqttUser = (process.env.MQTT_USERNAME || 'backend_admin').trim();
        const mqttPass = (process.env.MQTT_PASSWORD || 'super_secret_backend').trim();

        try {
            // Ensure the password file exists natively
            if (!fs.existsSync(this.pwdPath)) {
                fs.writeFileSync(this.pwdPath, '', 'utf8');
                try {
                    execSync(`sudo chmod 666 ${this.pwdPath}`);
                } catch(e) {}
            }

            // Always explicitly add/update the master user password
            this._runPasswdCommand(`-b ${this.pwdPath} ${mqttUser} ${mqttPass}`);
            
            // Ensure ACL has the master user with full access
            await this.regenerateACL();
            
            // Reload broker to apply
            this.reloadMosquitto();
            
            console.log(`[MQTT_PROVISION] Master access secured for user: ${mqttUser}`);
        } catch (error) {
            console.error(`[MQTT_PROVISION] Warning: Failed to secure master access. Mosquitto may reject connection.`, error.message);
        }
    }

    /**
     * No-op: We no longer generate unique passwords for every device
     */
    async syncDeviceCredential(deviceId, secretKey) {
        // Deliberately left empty to simplify architecture.
        // All devices will share the master credentials.
        return Promise.resolve();
    }

    /**
     * No-op: We no longer manage unique passwords for every device
     */
    async removeDeviceCredential(deviceId) {
        // Deliberately left empty to simplify architecture.
        return Promise.resolve();
    }

    /**
     * Regenerate the ACL file with just the master user
     */
    async regenerateACL() {
        const mqttUser = (process.env.MQTT_USERNAME || 'backend_admin').trim();
        const aclContent = `user ${mqttUser}\ntopic readwrite #\n\n`;

        try {
            fs.writeFileSync(this.aclPath, aclContent, 'utf8');
        } catch (error) {
            console.error("Failed to regenerate ACL:", error.message);
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
