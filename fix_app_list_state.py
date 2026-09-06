with open("frontend/src/pages/ApplicationsList.jsx", "r") as f:
    content = f.read()

bad_code = """    // Update Recent Devices
    setRecentDevices(prev => {
      const updated = prev.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );
      return updated;
    });

    // Update Counts Intelligently
    setWorkspace(prev => {"""

good_code = """    // Update Counts Intelligently
    setWorkspace(prev => {
      if (!prev) return prev;
      
      let updatedRecent = prev.recent_devices || [];
      updatedRecent = updatedRecent.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );"""

content = content.replace(bad_code, good_code)

if "offline_devices: updatedOffline" in content and "recent_devices: updatedRecent" not in content:
    content = content.replace("offline_devices: updatedOffline", "offline_devices: updatedOffline,\n        recent_devices: updatedRecent")

with open("frontend/src/pages/ApplicationsList.jsx", "w") as f:
    f.write(content)

print("Fixed ApplicationsList state crash")
