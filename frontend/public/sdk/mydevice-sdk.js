/**
 * MyDevice Node.js SDK v1.0
 * =========================
 * A simple library to connect your device to the MyDevice IoT Platform.
 *
 * Installation:
 *   npm install mqtt
 *   Place this file (mydevice-sdk.js) in your project, then:
 *     const { MyDevice } = require('./mydevice-sdk');
 *
 * Usage:
 *   const device = new MyDevice('DEV-001-ABCD', 'your_secret_key');
 *
 *   // Register capabilities
 *   device.addCapability('motor_control', 'Motor Control', 'Control actuators', 'motor_status.fan_speed');
 *   device.addAction('motor_control', 'SET_FAN_SPEED', 'Set Fan Speed', '0=off, 3=high', {
 *       speed: { type: 'number', min: 0, max: 3, step: 1, required: true }
 *   });
 *
 *   // Handle commands
 *   device.onCommand('SET_FAN_SPEED', (params) => {
 *       console.log('Fan speed:', params.speed);
 *       return true; // true=COMPLETED, false=FAILED
 *   });
 *
 *   // Connect
 *   device.connect();
 *
 *   // Send telemetry
 *   setInterval(() => {
 *       device.send('sensor_1', { temperature: 25.4, humidity: 60 });
 *   }, 5000);
 */

const mqtt = require('mqtt');

class Capability {
    constructor(name, label, description = '', statePath = '') {
        this.name = name;
        this.label = label;
        this.description = description;
        this.statePath = statePath;
        this.actions = [];
    }

    addAction(name, label, description = '', parameters = {}) {
        this.actions.push({ name, label, description, parameters });
        return this;
    }

    toJSON() {
        const obj = {
            name: this.name,
            label: this.label,
            description: this.description,
        };
        if (this.actions.length > 0) obj.actions = this.actions;
        if (this.statePath) obj.state_mapping = { path: this.statePath, unit: 'metrics' };
        return obj;
    }
}

class MyDevice {
    /**
     * @param {string} deviceId   - Your device ID (e.g. 'DEV-001-ABCD')
     * @param {string} secretKey  - Your device secret key
     * @param {string} [broker]   - MQTT broker host (default: 'mydevice.in')
     * @param {number} [port]     - MQTT broker port (default: 1883)
     */
    constructor(deviceId, secretKey, broker = 'mydevice.in', port = 1883) {
        this.deviceId = deviceId;
        this.secretKey = secretKey;
        this.broker = broker;
        this.port = port;

        // Topics
        this._tData   = `devices/${deviceId}/data`;
        this._tStatus = `devices/${deviceId}/status`;
        this._tCmd    = `devices/${deviceId}/command`;
        this._tCmdAck = `devices/${deviceId}/command/ack`;
        this._tCaps   = `devices/${deviceId}/capabilities`;

        // Internal state
        this._capabilities = [];
        this._handlers = {};
        this._client = null;
        this._connected = false;
    }

    // ── Capabilities ─────────────────────────────────────────────────

    /**
     * Register a capability group.
     * @param {string} name        - Snake_case ID, e.g. 'motor_control'
     * @param {string} label       - Human label
     * @param {string} [description]
     * @param {string} [statePath] - Telemetry key path for state display
     * @returns {Capability} - call .addAction() on it
     */
    addCapability(name, label, description = '', statePath = '') {
        const cap = new Capability(name, label, description, statePath);
        this._capabilities.push(cap);
        return cap;
    }

    /**
     * Add an action to an existing capability.
     * @param {string} capName    - Must match a name from addCapability()
     * @param {string} actionName - Command type string
     * @param {string} label      - Human label
     * @param {string} [description]
     * @param {object} [parameters] - { paramName: { type, min, max, step, required } }
     */
    addAction(capName, actionName, label, description = '', parameters = {}) {
        const cap = this._capabilities.find(c => c.name === capName);
        if (cap) cap.addAction(actionName, label, description, parameters);
        return this;
    }

    /** Publish all registered capabilities to the platform (retained). */
    publishCapabilities() {
        if (!this._capabilities.length) return;
        const payload = this._capabilities.map(c => c.toJSON());
        this._client.publish(this._tCaps, JSON.stringify(payload), { retain: true });
    }

    // ── Commands ─────────────────────────────────────────────────────

    /**
     * Register a handler for a command type.
     * Handler receives params object, returns true (COMPLETED) or false (FAILED).
     *
     * @param {string} commandType
     * @param {function} handler - (params) => boolean
     */
    onCommand(commandType, handler) {
        this._handlers[commandType] = handler;
        return this;
    }

    // ── Telemetry ────────────────────────────────────────────────────

    /**
     * Send telemetry data.
     * @param {string} source - Logical group name, e.g. 'sensor_1'
     * @param {object} fields - Key=value pairs of telemetry data
     *
     * Example:
     *   device.send('sensor_1', { temperature: 25.4, humidity: 60 });
     */
    send(source = 'sensor_1', fields = {}) {
        if (!this._client) return;
        this._client.publish(this._tData, JSON.stringify({
            device_id: this.deviceId,
            source,
            data: fields,
        }));
    }

    // ── Connection ───────────────────────────────────────────────────

    /** Connect to the MyDevice platform. */
    connect() {
        this._client = mqtt.connect(`mqtt://${this.broker}:${this.port}`, {
            clientId: this.deviceId,
            username: this.deviceId,
            password: this.secretKey,
            will: {
                topic: this._tStatus,
                payload: JSON.stringify({ device_id: this.deviceId, status: 'offline' }),
                retain: false,
            },
        });

        this._client.on('connect', () => {
            this._connected = true;
            this._client.subscribe(this._tCmd);
            this.setStatus('online');
            this.publishCapabilities();
            console.log(`[MyDevice] Connected as ${this.deviceId}`);
        });

        this._client.on('close', () => {
            this._connected = false;
        });

        this._client.on('message', (topic, payload) => {
            try {
                const envelope = JSON.parse(payload.toString());
                const cmdType = envelope.command_type || envelope.type || envelope.command || 'UNKNOWN';
                const params  = envelope.parameters || envelope.payload || {};
                const cmdId   = envelope.command_id || 'n/a';
                const corrId  = envelope.correlation_id || 'n/a';

                let status = 'REJECTED';
                const handler = this._handlers[cmdType];
                if (handler) {
                    try {
                        status = handler(params) ? 'COMPLETED' : 'FAILED';
                    } catch (e) {
                        status = 'FAILED';
                        console.error(`[MyDevice] Command handler error: ${e.message}`);
                    }
                }

                if (cmdId !== 'n/a') {
                    this._client.publish(this._tCmdAck, JSON.stringify({
                        command_id: cmdId,
                        correlation_id: corrId,
                        status,
                    }));
                }
            } catch (e) {
                console.error(`[MyDevice] Message processing error: ${e.message}`);
            }
        });

        return this;
    }

    /** Disconnect gracefully. */
    disconnect() {
        if (this._client) {
            this.setStatus('offline');
            setTimeout(() => this._client.end(), 300);
            this._connected = false;
        }
    }

    /** Returns true if connected. */
    get isConnected() { return this._connected; }

    // ── Status ───────────────────────────────────────────────────────

    /** Publish an explicit status ("online" or "offline"). */
    setStatus(status) {
        this._client.publish(this._tStatus, JSON.stringify({
            device_id: this.deviceId,
            status,
        }));
    }
}

module.exports = { MyDevice, Capability };
