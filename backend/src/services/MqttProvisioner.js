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
     * Helper to safely execute mosquitto_passwd natively
     */
    _runPasswdCommand(args) {
        // We assume sudo is required for mosquitto_passwd. If the server is correctly configured,
        // it shouldn't prompt for a password. If it fails, we throw so the caller knows.
        try {
            execSync(`sudo mosquitto_passwd ${args}`);
        } catch (err) {
            throw new Error(`Failed to execute mosquitto_passwd: ${err.message}`);
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
     * Regenerate the entire ACL file from the database atomically
     */
    async regenerateACL() {
        const mqttUser = (process.env.MQTT_USERNAME || 'backend_admin').trim();
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

            // Write atomically to prevent mosquitto from reading partial files during reload
            const tmpAclPath = this.aclPath + '.tmp';
            fs.writeFileSync(tmpAclPath, aclContent, 'utf8');
            execSync(`sudo mv ${tmpAclPath} ${this.aclPath}`);
            // Ensure permissions are correct after move
            execSync(`sudo chmod 666 ${this.aclPath}`);
            
        } catch (error) {
            console.error("Failed to regenerate ACL atomically:", error.message);
            throw error; // Fail loudly
        }
    }

    /**
     * Explicit, one-time provisioning of the master backend credentials.
     * This is only intended to be called by manual CLI scripts.
     */
    async provisionMasterCredentials() {
        const mqttUser = (process.env.MQTT_USERNAME || 'backend_admin').trim();
        const mqttPass = (process.env.MQTT_PASSWORD || 'super_secret_backend').trim();
        
        console.log(`Provisioning master credentials for ${mqttUser}...`);
        
        if (!fs.existsSync(this.pwdPath)) {
            fs.writeFileSync(this.pwdPath, '', 'utf8');
            try { execSync(`sudo chmod 666 ${this.pwdPath}`); } catch(e) {}
        }
        
        this._runPasswdCommand(`-b ${this.pwdPath} ${mqttUser} ${mqttPass}`);
        await this.regenerateACL();
        this.reloadMosquitto();
        console.log(`Master credentials successfully provisioned for ${mqttUser}`);
    }

    /**
     * Reload the Mosquitto broker to pick up password/ACL changes.
     * Uses systemctl rather than sending naked signals.
     */
    reloadMosquitto() {
        try {
            execSync('sudo systemctl reload mosquitto');
        } catch (error) {
            console.error("Failed to reload Mosquitto via systemctl:", error.message);
            throw error;
        }
    }
}

module.exports = new MqttProvisioner();
