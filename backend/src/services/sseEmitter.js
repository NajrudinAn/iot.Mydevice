const EventEmitter = require('events');

class SSEEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(1000); // Allow many workspace connections
    }

    /**
     * Broadcasts a device status change.
     * @param {string} workspaceId 
     * @param {object} deviceData { deviceId, status, lastSeen }
     */
    emitStatusChange(workspaceId, deviceData) {
        if (!workspaceId) return;
        console.log(`[SSE Emit Status] Workspace ${workspaceId}:`, deviceData);
        this.emit(`workspace:${workspaceId}:status`, deviceData);
    }

    /**
     * Broadcasts live telemetry data.
     * @param {string} workspaceId 
     * @param {object} telemetryData { deviceId, timestamp, data }
     */
    emitTelemetry(workspaceId, telemetryData) {
        if (!workspaceId) return;
        // console.log(`[SSE Emit Telemetry] Workspace ${workspaceId}:`, telemetryData.deviceId);
        this.emit(`workspace:${workspaceId}:telemetry`, telemetryData);
    }

    /**
     * Broadcasts command status changes.
     * @param {string} workspaceId
     * @param {object} commandData { commandId, deviceId, status, errorCode, timestamp }
     */
    emitCommandStatusChange(workspaceId, commandData) {
        if (!workspaceId) return;
        console.log(`[SSE Emit Command Status] Workspace ${workspaceId}:`, commandData);
        this.emit(`workspace:${workspaceId}:command-status`, commandData);
    }

    /**
     * Broadcasts capability updates.
     * @param {string} workspaceId
     * @param {object} data { deviceId, timestamp }
     */
    emitCapabilityUpdate(workspaceId, data) {
        if (!workspaceId) return;
        this.emit(`workspace:${workspaceId}:capability-update`, data);
    }

    /**
     * Broadcasts MyDevice-Managed Action changes.
     * @param {string} workspaceId
     * @param {object} data { type, action, id }
     */
    emitActionUpdate(workspaceId, data) {
        if (!workspaceId) return;
        this.emit(`workspace:${workspaceId}:action-update`, data);
    }
}

const sseEmitter = new SSEEmitter();
module.exports = sseEmitter;
