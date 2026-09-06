const Command = require('../models/command');
const sseEmitter = require('./sseEmitter');

class CommandMonitor {
    constructor() {
        this.intervalId = null;
    }

    start(intervalMs = 5000, timeoutSeconds = 15) {
        if (this.intervalId) return;
        
        console.log(`Starting Command Monitor (Timeout check every ${intervalMs}ms)`);
        
        this.intervalId = setInterval(async () => {
            try {
                const timedOutCommands = await Command.processTimeouts(timeoutSeconds);
                if (timedOutCommands && timedOutCommands.length > 0) {
                    console.log(`Command Monitor: Timed out ${timedOutCommands.length} commands.`);
                    for (const cmd of timedOutCommands) {
                        sseEmitter.emitCommandStatusChange(cmd.workspace_id, {
                            commandId: cmd.id,
                            deviceId: cmd.public_device_id,
                            status: 'TIMEOUT',
                            errorCode: 'COMMAND_TIMEOUT',
                            timestamp: cmd.failed_at
                        });
                    }
                }
            } catch (err) {
                console.error('Error in CommandMonitor:', err);
            }
        }, intervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

module.exports = new CommandMonitor();
