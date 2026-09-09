const { spawn } = require('child_process');

class MqttProvisioner {
    constructor() {
        // This is the strict path configured in /etc/sudoers.d/
        this.helperPath = '/usr/local/bin/mqtt_provision_helper.sh';
    }

    /**
     * Executes the privileged helper script with the given action and deviceId.
     * Securely pipes the secretKey via stdin to prevent command-line snooping.
     */
    _executeHelper(action, deviceId, secretKey = null) {
        return new Promise((resolve, reject) => {
            // Strict regex validation at the Node.js boundary before even calling sudo
            if (!/^DEV-[a-zA-Z0-9\-]+$/.test(deviceId)) {
                return reject(new Error(`Invalid device ID format: ${deviceId}`));
            }

            if (deviceId === 'mydevice_backend' || deviceId === 'backend_admin') {
                return reject(new Error('Refusing to provision backend service account dynamically.'));
            }

            const child = spawn('sudo', ['-n', this.helperPath, action, deviceId], {
                stdio: ['pipe', 'pipe', 'pipe'] // Pipe stdin, stdout, stderr
            });

            let stdoutData = '';
            let stderrData = '';

            child.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdoutData);
                } else {
                    reject(new Error(`Provisioning helper failed with code ${code}. Stderr: ${stderrData.trim()}`));
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Failed to spawn privileged helper: ${err.message}`));
            });

            // Securely stream the secret via stdin and close it
            if (action === 'add' && secretKey) {
                child.stdin.write(`${secretKey}\n`);
            }
            child.stdin.end();
        });
    }

    /**
     * Add or update a device's credentials safely using the helper.
     */
    async syncDeviceCredential(deviceId, secretKey) {
        if (!secretKey || secretKey.length < 16) {
            throw new Error('Invalid secret key for provisioning');
        }

        try {
            await this._executeHelper('add', deviceId, secretKey);
        } catch (error) {
            console.error('[MQTT Provisioner] syncDeviceCredential failed:', error.message);
            throw new Error("MQTT Provisioning Failed");
        }
    }

    /**
     * Remove a device's credentials safely using the helper.
     */
    async removeDeviceCredential(deviceId) {
        try {
            await this._executeHelper('remove', deviceId);
        } catch (error) {
            console.error('[MQTT Provisioner] removeDeviceCredential failed:', error.message);
            throw new Error("MQTT Credential Revocation Failed");
        }
    }
}

module.exports = new MqttProvisioner();
