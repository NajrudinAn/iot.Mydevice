const mqtt = require('mqtt');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/iot_platform'
});

const BROKER_URL = 'mqtt://localhost:1883';
const args = process.argv.slice(2);
const deviceIds = args.length > 0 ? args : ['DEV-1-1788459702612', 'DEV-2-1788459702615'];

async function start() {
    console.log(`Fetching credentials for devices: ${deviceIds.join(', ')}`);
    
    // Fetch credentials from DB
    const result = await pool.query(
        'SELECT device_id, secret_key FROM devices WHERE device_id = ANY($1::text[])',
        [deviceIds]
    );

    const devices = result.rows;
    if (devices.length === 0) {
        console.error("No devices found in database matching those IDs.");
        process.exit(1);
    }

    console.log(`Found ${devices.length} devices in DB. Starting secure toggle simulation...`);

    const clients = {};

    // Connect each device with its own credentials
    for (const dev of devices) {
        console.log(`Connecting ${dev.device_id} with secret: ${dev.secret_key.substring(0,3)}...`);
        const client = mqtt.connect(BROKER_URL, {
            clientId: `Sim-${dev.device_id}`,
            username: dev.device_id,
            password: dev.secret_key,
            reconnectPeriod: 5000
        });

        client.on('connect', () => {
            console.log(`[${dev.device_id}] Authenticated and Connected to MQTT successfully.`);
        });

        client.on('error', (err) => {
            console.error(`[${dev.device_id}] MQTT Connection Error:`, err.message);
        });

        clients[dev.device_id] = client;
    }

    // Toggle loop
    let state = 'ONLINE';
    setInterval(() => {
        for (const [deviceId, client] of Object.entries(clients)) {
            if (client.connected) {
                const topic = `devices/${deviceId}/status`;
                const payload = JSON.stringify({ device_id: deviceId, status: state });
                client.publish(topic, payload, { qos: 1 }, (err) => {
                    if (err) {
                        console.error(`[${deviceId}] Failed to publish:`, err);
                    } else {
                        console.log(`[${deviceId}] Published securely -> ${state}`);
                    }
                });
            }
        }
        state = state === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    }, 2000);
}

start().catch(err => {
    console.error(err);
    process.exit(1);
});
