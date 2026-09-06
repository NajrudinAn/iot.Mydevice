with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

if "import { useAuth }" not in content:
    content = content.replace("import Spinner from '../components/ui/Spinner';", "import Spinner from '../components/ui/Spinner';\nimport { useAuth } from '../context/AuthContext';\nimport { useSSE } from '../hooks/useSSE';")

if "const { token } = useAuth();" not in content:
    content = content.replace("const { workspaceId, deviceId } = useParams();", "const { workspaceId, deviceId } = useParams();\n  const { token } = useAuth();")

# Remove setInterval logic and replace with useSSE
interval_logic = """  useEffect(() => {
      if (!sourceId || activeTab !== 'live' || error) return;
      
      const interval = setInterval(async () => {
          try {
              const params = { deviceId, limit: 10 };
              if (sourceId) params.source = sourceId;
              if (latestTimestampRef.current) {
                  params.since = latestTimestampRef.current;
              }
              const res = await platformClient.get(`/workspaces/${workspaceId}/data`, { params });
              if (res.data.records && res.data.records.length > 0) {
                  const newRecords = [...res.data.records].reverse(); 
                  setRecentRecords(prev => {
                      return [...res.data.records, ...prev].slice(0, 10);
                  });
                  setLiveData(prev => {
                      const next = { ...(prev || {}) };
                      newRecords.forEach(record => {
                          if (record.payload && typeof record.payload === 'object') {
                              const flat = flattenJSON(record.payload);
                              Object.entries(flat).forEach(([key, val]) => {
                                  const fieldDef = dataFields.find(f => f.field_name === key);
                                  if (sourceId === 'All' || (fieldDef && fieldDef.source === sourceId)) {
                                      next[key] = {
                                          value: val,
                                          timestamp: record.recorded_at
                                      };
                                  }
                              });
                          }
                          latestTimestampRef.current = record.recorded_at;
                      });
                      return next;
                  });
              }
          } catch (err) {
              console.error("Polling error", err);
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [sourceId, activeTab, workspaceId, deviceId, error, dataFields]);"""

use_sse_logic = """
  // Live SSE Status & Telemetry Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event, eventType) => {
      if (eventType === 'device-status') {
          if (!event || !event.deviceId || event.deviceId !== deviceId) return;
          setDevice(prev => prev ? { ...prev, status: event.status, last_seen: event.lastSeen } : prev);
      } 
      else if (eventType === 'device-telemetry') {
          if (!event || !event.deviceId || event.deviceId !== deviceId || !event.data) return;
          if (activeTab !== 'live') return;
          
          const newRecord = {
              device_id: event.deviceId,
              payload: event.data,
              recorded_at: event.timestamp
          };

          setRecentRecords(prev => {
              return [newRecord, ...prev].slice(0, 10);
          });

          setLiveData(prev => {
              const next = { ...(prev || {}) };
              if (event.data && typeof event.data === 'object') {
                  const flat = flattenJSON(event.data);
                  Object.entries(flat).forEach(([key, val]) => {
                      const fieldDef = dataFields.find(f => f.field_name === key);
                      if (sourceId === 'All' || (fieldDef && fieldDef.source === sourceId)) {
                          next[key] = {
                              value: val,
                              timestamp: event.timestamp
                          };
                      }
                  });
              }
              latestTimestampRef.current = event.timestamp;
              return next;
          });
      }
  });
"""

if interval_logic in content:
    content = content.replace(interval_logic, use_sse_logic)
else:
    print("WARNING: Could not find setInterval logic to replace!")

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Injected useSSE into WorkspaceDataDeviceView.jsx")
