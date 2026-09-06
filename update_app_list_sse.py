with open("frontend/src/pages/ApplicationsList.jsx", "r") as f:
    content = f.read()

import_hook = "import { useSSE } from '../hooks/useSSE';\n"
if "useSSE" not in content:
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\n" + import_hook)

hook_usage = """
  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event) => {
    if (!event || !event.deviceId || !event.status) return;
    
    // Update Recent Devices
    setRecentDevices(prev => {
      const updated = prev.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );
      return updated;
    });

    // Update Counts Intelligently
    setWorkspace(prev => {
      if (!prev) return prev;
      
      const newStatus = event.status.toUpperCase();
      // To correctly update counts without refetching all devices, we need to know the OLD status.
      // We can look it up in recentDevices. If it's there, we know the exact transition.
      // If it's NOT in recentDevices, it's slightly harder, but in this specific SaaS, 
      // if we receive an ONLINE event, we can optimistically increment ONLINE and decrement OFFLINE
      // assuming it was OFFLINE before (because the backend ONLY emits events when status changes!).
      // This is a safe assumption per our new backend logic.

      let dOnline = 0;
      let dOffline = 0;

      if (newStatus === 'ONLINE') {
        dOnline = 1;
        dOffline = -1;
      } else if (newStatus === 'OFFLINE') {
        dOnline = -1;
        dOffline = 1;
      }

      // Ensure counts don't go below 0
      const updatedOnline = Math.max(0, (prev.online_devices || 0) + dOnline);
      const updatedOffline = Math.max(0, (prev.offline_devices || 0) + dOffline);
      
      // Total stays the same
      return {
        ...prev,
        online_devices: updatedOnline,
        offline_devices: updatedOffline
      };
    });
  });
"""

# inject hook inside ApplicationsList component
if "useSSE(" not in content:
    content = content.replace("  useEffect(() => {\n    if (workspaceId) {\n      fetchData();", hook_usage + "\n  useEffect(() => {\n    if (workspaceId) {\n      fetchData();")

with open("frontend/src/pages/ApplicationsList.jsx", "w") as f:
    f.write(content)

print("Updated ApplicationsList.jsx with useSSE")
