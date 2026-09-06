const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883', { username: 'backend_admin', password: 'super_secret_backend' });
client.on('connect', () => {
    console.log('Connected. Publishing command...');
    const payload = JSON.stringify({
        command_id: 'test-1234',
        correlation_id: 'corr-1234',
        type: 'POWER_OFF',
        payload: {}
    });
    client.publish('devices/DEV-007-A5D4/command', payload, { qos: 1 }, (err) => {
        if(err) console.error(err);
        else console.log('Published.');
        client.end();
    });
});
