const pool = require('../config/db');

class RetentionService {
    static async cleanupTelemetry() {
        try {
            // Delete telemetry ensuring shared-device protection rules.
            // max_days calculates the safest maximum retention limit among all apps sharing the device.
            // forever_count detects if any app wants to keep telemetry forever (0).
            const query = `
                WITH device_retentions AS (
                    SELECT 
                        d.device_id as string_device_id,
                        MAX(NULLIF(a.data_retention_days, 0)) as max_days,
                        COUNT(CASE WHEN a.data_retention_days = 0 THEN 1 END) as forever_count
                    FROM application_devices ad
                    JOIN applications a ON ad.application_id = a.id
                    JOIN devices d ON ad.device_id = d.id
                    GROUP BY d.device_id
                )
                DELETE FROM sensor_data sd
                USING device_retentions dr
                WHERE sd.device_id = dr.string_device_id
                  AND dr.forever_count = 0
                  AND dr.max_days IS NOT NULL
                  AND sd.recorded_at < NOW() - (dr.max_days * INTERVAL '1 day');
            `;
            const result = await pool.query(query);
            if (result.rowCount > 0) {
                console.log(`[Retention] Cleaned up ${result.rowCount} old telemetry records.`);
            }
        } catch (err) {
            console.error('[Retention] Error during telemetry cleanup:', err);
        }
    }

    static async cleanupCommandHistory() {
        try {
            // Delete commands where the age exceeds the workspace's configured retention seconds.
            // A NULL retention indicates 'forever' (no deletion).
            const query = `
                DELETE FROM device_commands dc
                USING workspaces w
                WHERE dc.workspace_id = w.id
                  AND w.command_history_retention_seconds IS NOT NULL
                  AND dc.created_at < NOW() - (w.command_history_retention_seconds * INTERVAL '1 second');
            `;
            const result = await pool.query(query);
            if (result.rowCount > 0) {
                console.log(`[Retention] Cleaned up ${result.rowCount} old command history records.`);
            }
        } catch (err) {
            console.error('[Retention] Error during command history cleanup:', err);
        }
    }

    static start(intervalMs = 60 * 60 * 1000) { // Default to 1 hour
        if (this.intervalId) {
            console.warn('[Retention] Cleanup job is already running. Avoiding duplicate execution.');
            return;
        }
        console.log(`[Retention] Starting telemetry retention job with interval ${intervalMs}ms.`);
        
        // Initial run
        this.cleanupTelemetry();
        this.cleanupCommandHistory();
        
        // Scheduled runs
        this.intervalId = setInterval(() => {
            this.cleanupTelemetry();
            this.cleanupCommandHistory();
        }, intervalMs);
    }
    
    static stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

module.exports = RetentionService;
