with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

import_hook = "import { useSSE } from '../hooks/useSSE';\n"
if "useSSE" not in content:
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\n" + import_hook)

if "const { token } =" not in content and "const { user, token } =" not in content:
    content = content.replace("const { workspaceId, deviceId } = useParams();", "const { workspaceId, deviceId } = useParams();\n  const { token } = useAuth();")

hook_usage = """
  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event) => {
    if (!event || !event.deviceId || !event.status) return;
    
    // Update Device Status if it's the current device
    setDevice(prev => {
      if (prev && prev.device_id === event.deviceId) {
        return { ...prev, status: event.status, last_seen: event.lastSeen };
      }
      return prev;
    });
  });
"""

if "useSSE(" not in content:
    content = content.replace("  useEffect(() => {\n    fetchDeviceData();", hook_usage + "\n  useEffect(() => {\n    fetchDeviceData();")

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Injected useSSE into WorkspaceDataDeviceView.jsx")
