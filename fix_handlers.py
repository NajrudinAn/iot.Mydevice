with open("backend/src/mqtt/handlers.js", "r") as f:
    content = f.read()

# Add import for sseEmitter
if "const sseEmitter = require('../services/sseEmitter');" not in content:
    content = "const sseEmitter = require('../services/sseEmitter');\n" + content

# In handleData, device is already fetched: const device = await Device.findByDeviceId(topicDeviceId);
# We need to emit event if status changes
handle_data_old = """    // 6. Update device status and last_seen
    await Device.updateStatusAndLastSeen(topicDeviceId, 'ONLINE');"""
    
handle_data_new = """    // 6. Update device status and last_seen
    const updatedDevice = await Device.updateStatusAndLastSeen(topicDeviceId, 'ONLINE');
    
    // Emit SSE if status changed from something else to ONLINE
    if (device.status !== 'ONLINE' && updatedDevice && device.workspace_id) {
        sseEmitter.emitStatusChange(device.workspace_id, {
            deviceId: topicDeviceId,
            status: 'ONLINE',
            lastSeen: updatedDevice.last_seen
        });
    }"""
content = content.replace(handle_data_old, handle_data_new)

# In handleStatus
handle_status_old = """    // Update status and last_seen
    await Device.updateStatusAndLastSeen(topicDeviceId, status);"""

handle_status_new = """    // Update status and last_seen
    const updatedDevice = await Device.updateStatusAndLastSeen(topicDeviceId, status);
    
    // Emit SSE if status changed
    if (device.status !== status && updatedDevice && device.workspace_id) {
        sseEmitter.emitStatusChange(device.workspace_id, {
            deviceId: topicDeviceId,
            status: status,
            lastSeen: updatedDevice.last_seen
        });
    }"""
content = content.replace(handle_status_old, handle_status_new)

with open("backend/src/mqtt/handlers.js", "w") as f:
    f.write(content)

print("Handlers fixed.")
