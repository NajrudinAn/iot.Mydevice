const MqttProvisioner = require('../src/services/MqttProvisioner');
const { initMqttClient } = require('../src/mqtt/client');
const child_process = require('child_process');

jest.mock('child_process');
jest.mock('mqtt', () => ({
    connect: jest.fn(() => ({
        on: jest.fn(),
        subscribe: jest.fn(),
        publish: jest.fn()
    }))
}));

describe('MQTT Provisioning & Client Architecture', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MQTT_USERNAME = 'test_admin';
        process.env.MQTT_PASSWORD = 'test_password';
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
        
        const originalError = console.error;
        console.error = jest.fn();
        
        initMqttClient();
        
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('FATAL: MQTT_PASSWORD is not defined'));
        expect(mqtt.connect).not.toHaveBeenCalled();
        
        console.error = originalError;
    });

    test('initMqttClient defaults to mydevice_backend if username is missing', () => {
        delete process.env.MQTT_USERNAME;
        const mqtt = require('mqtt');
        initMqttClient();
        expect(mqtt.connect).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                username: 'mydevice_backend',
                password: 'test_password'
            })
        );
    });
});

describe('MqttProvisioner Privileged Helper Wrapping', () => {
    let mockSpawn;
    let mockStdin;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockStdin = {
            write: jest.fn(),
            end: jest.fn()
        };
        
        mockSpawn = jest.fn((cmd, args, opts) => {
            return {
                stdout: { on: jest.fn((event, cb) => { if (event === 'data') cb('SUCCESS\n'); }) },
                stderr: { on: jest.fn() },
                on: jest.fn((event, cb) => {
                    if (event === 'close') cb(0); // Simulate success exit code 0
                }),
                stdin: mockStdin
            };
        });
        
        require('child_process').spawn.mockImplementation(mockSpawn);
    });

    test('syncDeviceCredential refuses invalid device IDs', async () => {
        await expect(MqttProvisioner.syncDeviceCredential('invalid-id', 'secret1234567890123')).rejects.toThrow('MQTT Provisioning Failed');
        expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('syncDeviceCredential accepts application real device format like DEV-A1B2C3', async () => {
        await MqttProvisioner.syncDeviceCredential('DEV-A1B2C3', 'secret1234567890123');
        expect(mockSpawn).toHaveBeenCalled();
    });

    test('syncDeviceCredential refuses to modify mydevice_backend', async () => {
        await expect(MqttProvisioner.syncDeviceCredential('mydevice_backend', 'secret1234567890123')).rejects.toThrow('MQTT Provisioning Failed');
        expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('syncDeviceCredential spawns helper with sudo and correctly streams secret via stdin', async () => {
        await MqttProvisioner.syncDeviceCredential('DEV-123-ABCD', 'secret1234567890123');

        expect(mockSpawn).toHaveBeenCalledWith(
            'sudo',
            ['-n', '/usr/local/bin/mqtt_provision_helper.sh', 'add', 'DEV-123-ABCD'],
            expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] })
        );

        // Secret MUST be streamed to stdin, not passed as args
        // Also it MUST have a newline because `read` in bash with `set -e` will fail at EOF without a newline
        expect(mockStdin.write).toHaveBeenCalledWith('secret1234567890123\n');
        expect(mockStdin.end).toHaveBeenCalled();
    });

    test('removeDeviceCredential spawns helper to remove device without streaming secret', async () => {
        await MqttProvisioner.removeDeviceCredential('DEV-123-ABCD');

        expect(mockSpawn).toHaveBeenCalledWith(
            'sudo',
            ['-n', '/usr/local/bin/mqtt_provision_helper.sh', 'remove', 'DEV-123-ABCD'],
            expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] })
        );

        expect(mockStdin.write).not.toHaveBeenCalled();
        expect(mockStdin.end).toHaveBeenCalled();
    });

    test('throws explicit error if helper returns non-zero code', async () => {
        mockSpawn.mockImplementation((cmd, args, opts) => {
            return {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn((event, cb) => { if (event === 'data') cb('Fake stderr error\n'); }) },
                on: jest.fn((event, cb) => {
                    if (event === 'close') cb(2); // Simulate failure exit code 2
                }),
                stdin: mockStdin
            };
        });

        // The public method catches the internal rejection and wraps it in a safe message
        await expect(MqttProvisioner.syncDeviceCredential('DEV-123-ABCD', 'secret1234567890123'))
            .rejects.toThrow('MQTT Provisioning Failed');
    });
});
