const { pool } = require('../config/db');
const sseEmitter = require('./sseEmitter');

/**
 * Periodically checks for devices that haven't sent data in a while and marks them OFFLINE.
 */
class DeviceMonitor {
    constructor() {
        this.interval = null;
        this.TIMEOUT_MS = 86400000; // 24 hours
    }

    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this.checkStaleDevices(), 600000); // Check every 10 minutes
        console.log('Device Monitor started: checking for stale devices every 10m (24h timeout)');
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    async checkStaleDevices() {
        try {
            // Find devices that are ONLINE but haven't been seen in over 24 hours
            // This is a last-resort fallback for Mosquitto LWT failures.
            // A short timeout here breaks SDKs that deduplicate data.
            const query = `
                UPDATE devices
                SET status = 'OFFLINE'
                WHERE status = 'ONLINE' 
                  AND (last_seen IS NULL OR last_seen < NOW() - INTERVAL '24 hours')
                RETURNING id, device_id, workspace_id, status, last_seen
            `;
            
            const result = await pool.query(query);
            
            // Emit SSE events for each newly offline device
            if (result.rowCount > 0) {
                for (const device of result.rows) {
                    if (device.workspace_id) {
                        sseEmitter.emitStatusChange(device.workspace_id, {
                            deviceId: device.device_id,
                            status: 'OFFLINE',
                            lastSeen: device.last_seen
                        });
                        console.log(`Device ${device.device_id} marked OFFLINE due to timeout`);
                    }
                }
            }
        } catch (err) {
            console.error('Error in checkStaleDevices:', err);
        }
    }
}

const deviceMonitor = new DeviceMonitor();
module.exports = deviceMonitor;
