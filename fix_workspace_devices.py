with open("frontend/src/pages/WorkspaceDevices.jsx", "r") as f:
    content = f.read()

import_hook = "import { useSSE } from '../hooks/useSSE';\n"
if "useSSE" not in content:
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\n" + import_hook)
    
if "useAuth" not in content:
    # If useAuth is not even imported, add it.
    content = content.replace("import { platformClient } from '../api/client';", "import { platformClient } from '../api/client';\nimport { useAuth } from '../context/AuthContext';\nimport { useSSE } from '../hooks/useSSE';")

if "const { token } =" not in content and "const { user, token } =" not in content:
    content = content.replace("const { workspaceId } = useParams();", "const { workspaceId } = useParams();\n  const { token } = useAuth();")

hook_usage = """
  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event) => {
    if (!event || !event.deviceId || !event.status) return;
    
    setDevices(prev => {
      return prev.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );
    });
  });
"""

if "useSSE(" not in content:
    content = content.replace("  useEffect(() => {\n    fetchDevices();", hook_usage + "\n  useEffect(() => {\n    fetchDevices();")

with open("frontend/src/pages/WorkspaceDevices.jsx", "w") as f:
    f.write(content)

print("Injected useSSE into WorkspaceDevices.jsx")
