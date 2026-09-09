const MqttProvisioner = require('../src/services/MqttProvisioner');
const { initMqttClient } = require('../src/mqtt/client');
const fs = require('fs');
const child_process = require('child_process');

jest.mock('fs');
jest.mock('child_process');
jest.mock('mqtt', () => ({
    connect: jest.fn(() => ({
        on: jest.fn(),
        subscribe: jest.fn(),
        publish: jest.fn()
    }))
}));
jest.mock('../src/config/db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [{ device_id: 'DEV-TEST-01' }] })
}));

describe('MQTT Provisioning & Client Architecture', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MQTT_USERNAME = 'test_admin';
        process.env.MQTT_PASSWORD = 'test_password';
    });

    test('MqttProvisioner should NOT expose ensureBackendAccess (preventing automatic startup rewrite)', () => {
        expect(MqttProvisioner.ensureBackendAccess).toBeUndefined();
    });

    test('initMqttClient uses credentials from environment variables', () => {
        const mqtt = require('mqtt');
        initMqttClient();
        
        expect(mqtt.connect).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                username: 'test_admin',
                password: 'test_password'
            })
        );
    });

    test('initMqttClient fails gracefully and aborts if MQTT_PASSWORD is not defined', () => {
        delete process.env.MQTT_PASSWORD;
        const mqtt = require('mqtt');
        
        // Suppress expected console.error during test
        const originalError = console.error;
        console.error = jest.fn();
        
        initMqttClient();
        
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('FATAL: MQTT_PASSWORD is not defined'));
        expect(mqtt.connect).not.toHaveBeenCalled();
        
        console.error = originalError;
    });

    test('index.js and provisionBroker.js load .env via absolute paths', () => {
        const actualFs = jest.requireActual('fs');
        const indexSrc = actualFs.readFileSync(require('path').resolve(__dirname, '../src/index.js'), 'utf8');
        const provisionSrc = actualFs.readFileSync(require('path').resolve(__dirname, '../scripts/provisionBroker.js'), 'utf8');
        
        expect(indexSrc).toContain('path.resolve(__dirname, \'../.env\')');
        expect(provisionSrc).toContain('path.resolve(__dirname, \'../.env\')');
    });

    test('syncDeviceCredential constructs mosquitto_passwd command safely and reloads', async () => {
        await MqttProvisioner.syncDeviceCredential('DEV-123', 'secret456');

        expect(child_process.execSync).toHaveBeenCalledWith(
            expect.stringContaining('sudo mosquitto_passwd -b')
        );
        expect(child_process.execSync).toHaveBeenCalledWith(
            expect.stringContaining('DEV-123 secret456')
        );
        // Asserts reload uses systemctl and not naked pkill
        expect(child_process.execSync).toHaveBeenCalledWith('sudo systemctl reload mosquitto');
    });

    test('regenerateACL writes atomically using tmp file and mv', async () => {
        await MqttProvisioner.regenerateACL();
        
        // Ensure it writes to a .tmp file
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            '/tmp/mosquitto.acl.tmp',
            expect.stringContaining('user test_admin'),
            'utf8'
        );
        
        // Ensure it renames the file using mv
        expect(child_process.execSync).toHaveBeenCalledWith(
            expect.stringMatching(/sudo mv \/tmp\/mosquitto\.acl\.tmp .*mosquitto\.acl/)
        );
        
        // Ensure it contains device logic from DB
        expect(fs.writeFileSync.mock.calls[0][1]).toContain('user DEV-TEST-01');
    });

    test('regenerateACL failure throws explicitly rather than silencing', async () => {
        fs.writeFileSync.mockImplementationOnce(() => {
            throw new Error('Permission denied');
        });

        await expect(MqttProvisioner.regenerateACL()).rejects.toThrow('Permission denied');
    });
});
