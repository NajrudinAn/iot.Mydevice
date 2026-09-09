const mqtt = require('mqtt');
const handlers = require('./handlers');
require('dotenv').config();

let mqttClient = null;

const initMqttClient = () => {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    
    const username = (process.env.MQTT_USERNAME || 'backend_admin').trim();
    console.log(`[MQTT] Connecting to broker at ${brokerUrl} as user: ${username}`);
    
    // Connect to MQTT Broker
    mqttClient = mqtt.connect(brokerUrl, {
        reconnectPeriod: 5000, // Attempt reconnect every 5s if disconnected
        username: username,
        password: (process.env.MQTT_PASSWORD || 'super_secret_backend').trim()
    });

    mqttClient.on('connect', () => {
        console.log('MQTT connected');
        
        // Subscribe to Data and Status topics for all devices
        mqttClient.subscribe('devices/+/data', (err) => {
            if (!err) {
                console.log('Subscribed to device data: devices/+/data');
            } else {
                console.error('Failed to subscribe to data topic', err);
            }
        });

        mqttClient.subscribe('devices/+/status', (err) => {
            if (!err) {
                console.log('Subscribed to device status: devices/+/status');
            } else {
                console.error('Failed to subscribe to status topic', err);
            }
        });

        mqttClient.subscribe('devices/+/command/ack', (err) => {
            if (!err) {
                console.log('Subscribed to device command acks: devices/+/command/ack');
            } else {
                console.error('Failed to subscribe to command ack topic', err);
            }
        });

        mqttClient.subscribe('devices/+/capabilities', (err) => {
            if (!err) {
                console.log('Subscribed to device capabilities: devices/+/capabilities');
            } else {
                console.error('Failed to subscribe to capabilities topic', err);
            }
        });
    });

    mqttClient.on('message', async (topic, message) => {
        try {
            const parts = topic.split('/');
            if (parts.length >= 3 && parts[0] === 'devices') {
                const deviceId = parts[1];
                const type = parts[2];
                const payload = JSON.parse(message.toString());

                if (type === 'data') {
                    await handlers.handleData(deviceId, payload);
                } else if (type === 'status') {
                    await handlers.handleStatus(deviceId, payload);
                } else if (type === 'command' && parts[3] === 'ack') {
                    await handlers.handleCommandAck(deviceId, payload);
                } else if (type === 'capabilities') {
                    await handlers.handleCapabilities(deviceId, payload);
                }
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error.message);
        }
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT Connection Error:', err.message);
        // Fail gracefully, don't crash
    });

    mqttClient.on('offline', () => {
        console.warn('MQTT Client is offline. Attempting to reconnect...');
    });
};

const publishDeviceCommand = (deviceId, commandPayload) => {
    if (!mqttClient || !mqttClient.connected) {
        throw new Error("MQTT Client is not connected");
    }

    const topic = `devices/${deviceId}/command`;
    const payload = JSON.stringify(commandPayload);

    mqttClient.publish(topic, payload);
    console.log(`Published command to ${topic}: ${payload}`);
};

const closeMqttClient = () => {
    if (mqttClient) {
        mqttClient.end(false, () => {
            console.log('MQTT client closed cleanly');
        });
    }
};

const getMqttClient = () => mqttClient;

module.exports = { initMqttClient, publishDeviceCommand, getMqttClient, closeMqttClient };
