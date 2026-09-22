/**
 * MyDevice Node.js SDK v2.0 (Blueprint API)
 * =========================================
 * A comprehensive library to connect your device to the MyDevice IoT Platform.
 *
 * This SDK uses a declarative Blueprint API. You define what your device has
 * (Properties) and what it can do (Actions). The SDK automatically handles
 * MQTT connectivity, capability mapping, state syncing, and command routing.
 *
 * Installation:
 *   npm install mqtt
 *   Place this file (mydevice-sdk.js) in your project, then:
 *     const { MyDevice } = require('./mydevice-sdk');
 *
 * Usage:
 *   const device = new MyDevice('DEV-001', 'secret');
 *
 *   // 1. Read-only Telemetry
 *   device.addProperty('temperature', 'Temperature', 'number', { unit: '°C', writable: false });
 *
 *   // 2. Controllable Property (Switch)
 *   device.addProperty('light', 'Main Light', 'boolean', { 
 *      writable: true, 
 *      onChange: (val) => console.log(`Light is now ${val}`)
 *   });
 *
 *   // 3. Stateless Action
 *   device.addAction('reboot', 'Reboot Device', 'Restarts the device', {}, (params) => reboot());
 *
 *   device.connect();
 *
 *   setInterval(() => {
 *       device.updateProperty('temperature', readSensor());
 *   }, 5000);
 */

const mqtt = require('mqtt');

class MyDevice {
    /**
     * @param {string} deviceId   - Your device ID
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

        // State and Blueprints
        this._properties = {};
        this._actions = {};
        this._stateCache = {};

        // Internals
        this._client = null;
        this._connected = false;
    }

    // ── Blueprint API ────────────────────────────────────────────────

    /**
     * Define a property (telemetry state).
     * @param {string} name - ID of the property (e.g. 'fan_speed')
     * @param {string} label - Human-readable name
     * @param {string} dataType - 'number', 'boolean', 'string'
     * @param {object} options - Configuration options
     * @param {string} [options.unit] - e.g. '°C', '%'
     * @param {number} [options.min] - Minimum value (for numbers)
     * @param {number} [options.max] - Maximum value (for numbers)
     * @param {number} [options.step] - Step value (for numbers)
     * @param {string[]} [options.options] - List of strings for enum types
     * @param {boolean} [options.writable] - Can this be controlled from the platform?
     * @param {function} [options.onChange] - Callback function(value) triggered when changed from platform.
     */
    addProperty(name, label, dataType = 'number', {
        unit = '', min = null, max = null, step = null, options = null, writable = false, onChange = null
    } = {}) {
        const prop = {
            name, label, type: dataType, unit, writable, onChange
        };
        
        if (dataType === 'number') {
            if (min !== null) prop.min = min;
            if (max !== null) prop.max = max;
            if (step !== null) prop.step = step;
        } else if (options) {
            prop.options = options;
        }
        
        this._properties[name] = prop;
    }

    /**
     * Define a stateless action (e.g., Reboot, Calibrate).
     * @param {string} name - ID of the action
     * @param {string} label - Human-readable name
     * @param {string} description - Short description
     * @param {object} parameters - Parameter configurations { paramName: { type, min, max, required } }
     * @param {function} onExecute - Callback function(paramsDict) triggered when executed.
     */
    addAction(name, label, description = '', parameters = {}, onExecute = null) {
        this._actions[name] = {
            name, label, description, parameters, onExecute
        };
    }

    /**
     * Update the local state of a property and automatically publish to the platform.
     * @param {string} name - Property name
     * @param {any} value - New value
     * @param {boolean} forceSend - Send even if value hasn't changed locally
     */
    updateProperty(name, value, forceSend = false) {
        if (!this._properties[name]) {
            console.warn(`[MyDevice] Warning: Property '${name}' not defined.`);
            return;
        }

        if (!forceSend && this._stateCache[name] === value) {
            return;
        }
        this._stateCache[name] = value;

        if (this._connected) {
            this._sendTelemetry({ [name]: value });
        }
    }

    /**
     * Update multiple properties at once and send a single telemetry payload.
     * @param {object} updatesDict - { propName: value }
     */
    updateProperties(updatesDict) {
        const changed = {};
        for (const [name, value] of Object.entries(updatesDict)) {
            if (this._properties[name]) {
                if (this._stateCache[name] !== value) {
                    this._stateCache[name] = value;
                    changed[name] = value;
                }
            } else {
                console.warn(`[MyDevice] Warning: Property '${name}' not defined.`);
            }
        }
        
        if (Object.keys(changed).length > 0 && this._connected) {
            this._sendTelemetry(changed);
        }
    }

    // ── Platform Syncing ─────────────────────────────────────────────

    _generateCapabilitiesSchema() {
        const capabilities = [];
        
        // 1. Map Properties
        if (Object.keys(this._properties).length > 0) {
            const stateCap = {
                name: 'device_state',
                label: 'Device State',
                description: 'Device properties and sensors',
                actions: []
            };
            
            for (const [pName, p] of Object.entries(this._properties)) {
                if (p.writable) {
                    const actionDef = {
                        name: `SET_${pName.toUpperCase()}`,
                        label: `Set ${p.label}`,
                        description: `Update ${pName}`,
                        parameters: {
                            [pName]: { type: p.type, required: true }
                        }
                    };
                    if (p.min !== undefined) actionDef.parameters[pName].min = p.min;
                    if (p.max !== undefined) actionDef.parameters[pName].max = p.max;
                    if (p.step !== undefined) actionDef.parameters[pName].step = p.step;
                    if (p.options) actionDef.parameters[pName].options = p.options;
                    
                    stateCap.actions.push(actionDef);
                }
            }
            capabilities.push(stateCap);
        }
        
        // 2. Map Actions
        if (Object.keys(this._actions).length > 0) {
            const actionCap = {
                name: 'system_actions',
                label: 'System Actions',
                description: 'Stateless device commands',
                actions: []
            };
            for (const [aName, a] of Object.entries(this._actions)) {
                const formattedParams = {};
                for (const [pName, pConfig] of Object.entries(a.parameters)) {
                    formattedParams[pName] = typeof pConfig === 'object' ? pConfig : { type: 'string', required: true };
                }
                actionCap.actions.push({
                    name: aName,
                    label: a.label,
                    description: a.description,
                    parameters: formattedParams
                });
            }
            capabilities.push(actionCap);
        }
        
        return capabilities;
    }

    _publishSchema() {
        const schema = this._generateCapabilitiesSchema();
        if (schema && schema.length > 0) {
            this._client.publish(this._tCaps, JSON.stringify(schema), { retain: true });
        }
    }

    _sendTelemetry(dataDict) {
        const payload = {
            device_id: this.deviceId,
            source: 'state',
            data: dataDict
        };
        this._client.publish(this._tData, JSON.stringify(payload));
    }

    // ── Connection & Networking ──────────────────────────────────────

    connect() {
        this._client = mqtt.connect(`mqtt://${this.broker}:${this.port}`, {
            clientId: this.deviceId,
            username: this.deviceId,
            password: this.secretKey,
            reconnectPeriod: 3000,
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
            this._publishSchema();
            
            if (Object.keys(this._stateCache).length > 0) {
                this._sendTelemetry(this._stateCache);
            }
            console.log(`[MyDevice] Connected successfully as ${this.deviceId}`);
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

                if (cmdType.startsWith('SET_')) {
                    const propName = cmdType.substring(4).toLowerCase();
                    const targetProp = Object.keys(this._properties).find(p => p.toLowerCase() === propName);
                    
                    if (targetProp && this._properties[targetProp].writable) {
                        if (params[targetProp] !== undefined) {
                            const val = params[targetProp];
                            try {
                                if (this._properties[targetProp].onChange) {
                                    this._properties[targetProp].onChange(val);
                                }
                                this.updateProperty(targetProp, val, true);
                                status = 'COMPLETED';
                            } catch (e) {
                                console.error(`[MyDevice] Property handler error: ${e.message}`);
                                status = 'FAILED';
                            }
                        } else {
                            console.error(`[MyDevice] Missing parameter '${targetProp}' in command`);
                            status = 'FAILED';
                        }
                    }
                } else if (this._actions[cmdType]) {
                    try {
                        if (this._actions[cmdType].onExecute) {
                            this._actions[cmdType].onExecute(params);
                        }
                        status = 'COMPLETED';
                    } catch (e) {
                        console.error(`[MyDevice] Action handler error: ${e.message}`);
                        status = 'FAILED';
                    }
                } else {
                    console.error(`[MyDevice] Unknown command: ${cmdType}`);
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

    disconnect() {
        if (this._client) {
            this.setStatus('offline');
            setTimeout(() => this._client.end(), 300);
            this._connected = false;
        }
    }

    get isConnected() { return this._connected; }

    setStatus(status) {
        this._client.publish(this._tStatus, JSON.stringify({
            device_id: this.deviceId,
            status,
        }));
    }
}

module.exports = { MyDevice };
