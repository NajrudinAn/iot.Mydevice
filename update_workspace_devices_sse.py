with open("frontend/src/pages/WorkspaceDevices.jsx", "r") as f:
    content = f.read()

import_hook = "import { useSSE } from '../hooks/useSSE';\n"
if "useSSE" not in content:
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\n" + import_hook)

content = content.replace("const { user } = useAuth();", "const { user, token } = useAuth();")

hook_usage = """
  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event) => {
    if (!event || !event.deviceId || !event.status) return;
    
    // Update Devices List
    setDevices(prev => {
      const updated = prev.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );
      return updated;
    });
  });
"""

if "useSSE(" not in content:
    content = content.replace("  useEffect(() => {\n    if (workspaceId) {\n      fetchDevices();", hook_usage + "\n  useEffect(() => {\n    if (workspaceId) {\n      fetchDevices();")

with open("frontend/src/pages/WorkspaceDevices.jsx", "w") as f:
    f.write(content)

print("Updated WorkspaceDevices.jsx with useSSE")
