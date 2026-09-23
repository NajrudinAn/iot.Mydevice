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

/**
 * The MyDevice SDK Client.
 * Handles MQTT connection, telemetry syncing, and command routing automatically.
 */
class MyDevice {
    /**
     * Initializes a new MyDevice client.
     * @param {string} deviceId   - Your device ID (e.g. 'DEV-001').
     * @param {string} secretKey  - Your device secret key for authentication.
     * @param {string} [broker='mydevice.in'] - MQTT broker host address.
     * @param {number} [port=1883] - MQTT broker port.
     */
    constructor(deviceId, secretKey, broker = 'mydevice.in', port = 1883) {
        this.deviceId = deviceId;
        this.secretKey = secretKey;
        this.broker = broker;
        this.port = port;

        // MQTT Topics mapping based on the MyDevice architecture
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
     * Defines a generic property on the device (telemetry, state, or controllable feature).
     * @param {string} name - Unique identifier for the property (e.g. 'fan_speed').
     * @param {string} label - Human-readable name for UI generation (e.g. 'Fan Speed').
     * @param {string} [dataType='number'] - Data type: 'number', 'boolean', or 'string'.
     * @param {object} [options={}] - Additional configuration options.
     * @param {string} [options.unit] - Unit of measurement (e.g. '°C', '%').
     * @param {number} [options.min] - Minimum value (for numbers).
     * @param {number} [options.max] - Maximum value (for numbers).
     * @param {number} [options.step] - Step increment (for numbers).
     * @param {string[]} [options.options] - List of valid string options for enums.
     * @param {boolean} [options.writable] - If true, the platform can send SET commands to change this property.
     * @param {function(any):void} [options.onChange] - Callback function executed when the platform updates this property.
     */
    addProperty(name, label, dataType = 'number', {
        unit = '', min = null, max = null, step = null, options = null, writable = false, onChange = null
    } = {}) {
        const prop = { name, label, type: dataType, unit, writable, onChange };
        
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
     * Helper to define a read-only sensor or telemetry point.
     * @param {string} name - Unique identifier (e.g. 'temperature').
     * @param {string} label - Human-readable name (e.g. 'Room Temp').
     * @param {string} [dataType='number'] - Data type ('number', 'boolean', 'string').
     * @param {string} [unit=''] - Unit of measurement (e.g. '°C').
     */
    addReading(name, label, dataType = 'number', unit = '') {
        this.addProperty(name, label, dataType, { unit, writable: false });
    }

    /**
     * Helper to define a controllable On/Off switch.
     * @param {string} name - Unique identifier (e.g. 'main_light').
     * @param {string} label - Human-readable name (e.g. 'Main Light').
     * @param {function(boolean):void} onChange - Callback triggered when toggled from the platform.
     */
    addSwitch(name, label, onChange) {
        this.addProperty(name, label, 'boolean', { writable: true, onChange });
    }

    /**
     * Helper to define a controllable numeric slider.
     * @param {string} name - Unique identifier (e.g. 'fan_speed').
     * @param {string} label - Human-readable name (e.g. 'Fan Speed').
     * @param {number} min - Minimum value.
     * @param {number} max - Maximum value.
     * @param {function(number):void} onChange - Callback triggered when adjusted from the platform.
     * @param {number} [step=null] - Step increment.
     */
    addSlider(name, label, min, max, onChange, step = null) {
        this.addProperty(name, label, 'number', { min, max, step, writable: true, onChange });
    }

    /**
     * Defines a stateless action/command the device can execute (e.g. Reboot, Calibrate).
     * @param {string} name - Unique identifier (e.g. 'reboot').
     * @param {string} label - Human-readable name (e.g. 'Reboot Device').
     * @param {string} [description=''] - Description of what the action does.
     * @param {object} [parameters={}] - Object mapping parameter names to their types { paramName: { type: 'string', required: true } }.
     * @param {function(object):void} [onExecute] - Callback triggered when action is executed, receives parameter object.
     */
    addAction(name, label, description = '', parameters = {}, onExecute = null) {
        this._actions[name] = { name, label, description, parameters, onExecute };
    }

    /**
     * Updates the local state of a property and automatically publishes it to the platform.
     * @param {string} name - The property identifier to update.
     * @param {any} value - The new value.
     * @param {boolean} [forceSend=false] - If true, publishes to MQTT even if the local value hasn't changed.
     */
    updateProperty(name, value, forceSend = false) {
        if (!this._properties[name]) {
            console.warn(`[MyDevice] Warning: Property '${name}' not defined.`);
            return;
        }

        if (!forceSend && this._stateCache[name] === value) {
            return; // Skip sending if state unchanged
        }
        this._stateCache[name] = value;

        if (this._connected) {
            this._sendTelemetry({ [name]: value });
        }
    }

    /**
     * Updates multiple properties at once, pushing them to the platform in a single optimized telemetry payload.
     * @param {object} updatesDict - Key-value map of properties to update (e.g. { temperature: 25.0, humidity: 60 }).
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

    /**
     * Alias for `updateProperty` for shorter syntax.
     * @param {string} name - The property identifier.
     * @param {any} value - The new value.
     * @param {boolean} [forceSend=false] - Force publish to MQTT.
     */
    send(name, value, forceSend = false) {
        this.updateProperty(name, value, forceSend);
    }

    // ── Platform Syncing ─────────────────────────────────────────────

    /**
     * Internal method to generate JSON schema describing the device's capabilities to the platform.
     * @private
     */
    _generateCapabilitiesSchema() {
        const capabilities = [];
        
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

    /**
     * Internal method to publish blueprint capabilities as a retained MQTT message.
     * @private
     */
    _publishSchema() {
        const schema = this._generateCapabilitiesSchema();
        if (schema && schema.length > 0) {
            this._client.publish(this._tCaps, JSON.stringify(schema), { retain: true });
        }
    }

    /**
     * Internal method to publish the standard JSON telemetry payload.
     * @private
     */
    _sendTelemetry(dataDict) {
        const payload = {
            device_id: this.deviceId,
            source: 'state',
            data: dataDict
        };
        this._client.publish(this._tData, JSON.stringify(payload));
    }

    // ── Connection & Networking ──────────────────────────────────────

    /**
     * Connects to the MyDevice MQTT broker, syncs blueprints, and starts listening for commands.
     * Automatically handles reconnects.
     * @returns {MyDevice} Returns the current instance for chaining.
     */
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
            this._publishSchema(); // Sync the blueprint to the platform
            
            // Sync current state on connection
            if (Object.keys(this._stateCache).length > 0) {
                this._sendTelemetry(this._stateCache);
            }
            console.log(`[MyDevice] Connected successfully as ${this.deviceId}`);
        });

        this._client.on('close', () => {
            this._connected = false;
        });

        // Command routing
        this._client.on('message', (topic, payload) => {
            try {
                const envelope = JSON.parse(payload.toString());
                const cmdType = envelope.command_type || envelope.type || envelope.command || 'UNKNOWN';
                const params  = envelope.parameters || envelope.payload || {};
                const cmdId   = envelope.command_id || 'n/a';
                const corrId  = envelope.correlation_id || 'n/a';

                let status = 'REJECTED';

                // 1. Property SET Commands
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
                } 
                // 2. Stateless Actions
                else if (this._actions[cmdType]) {
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

                // Send ACK
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

    /**
     * Disconnects from the MyDevice platform gracefully.
     */
    disconnect() {
        if (this._client) {
            this.setStatus('offline');
            setTimeout(() => this._client.end(), 300);
            this._connected = false;
        }
    }

    /**
     * Checks if the device is currently connected to the MQTT broker.
     * @returns {boolean}
     */
    get isConnected() { return this._connected; }

    /**
     * Manually updates the device's online/offline status on the platform.
     * @param {string} status - 'online', 'offline', 'error', etc.
     */
    setStatus(status) {
        this._client.publish(this._tStatus, JSON.stringify({
            device_id: this.deviceId,
            status,
        }));
    }
}

module.exports = { MyDevice };
