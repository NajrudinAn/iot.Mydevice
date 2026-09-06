with open("frontend/src/pages/WorkspaceDeviceDetails.jsx", "r") as f:
    content = f.read()

import_hook = "import { useSSE } from '../hooks/useSSE';\n"
if "useSSE" not in content:
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\n" + import_hook)

content = content.replace("const { user } = useAuth();", "const { user, token } = useAuth();")

hook_usage = """
  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event) => {
    if (!event || !event.deviceId || !event.status) return;
    
    // Update Device Status if it's the current device
    setDevice(prev => {
      if (!prev || prev.device_id !== event.deviceId) return prev;
      return { ...prev, status: event.status, last_seen: event.lastSeen };
    });
  });
"""

if "useSSE(" not in content:
    content = content.replace("  useEffect(() => {\n    fetchDevice();", hook_usage + "\n  useEffect(() => {\n    fetchDevice();")

with open("frontend/src/pages/WorkspaceDeviceDetails.jsx", "w") as f:
    f.write(content)

print("Updated WorkspaceDeviceDetails.jsx with useSSE")
