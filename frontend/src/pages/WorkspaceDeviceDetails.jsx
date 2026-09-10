import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { platformClient } from '../api/client';
import { 
  ArrowLeft, Server, Activity, Clock, Trash2, AlertCircle, CheckCircle2, Copy, Terminal, Edit2, Check, X, ChevronDown, ChevronRight, Upload, Download
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useSSE } from '../hooks/useSSE';
import DeviceCommandPanel from '../components/commands/DeviceCommandPanel';

// Utility for formatting dates
const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Never connected';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + 
         date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const Toast = ({ message, type = 'success' }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem',
    backgroundColor: type === 'success' ? 'var(--green)' : 'var(--red)',
    color: 'white', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '0.75rem',
    zIndex: 9999, animation: 'modalSlideIn 0.3s ease-out'
  }}>
    {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
  </div>
);

export default function WorkspaceDeviceDetails() {
  const { workspaceId, deviceId } = useParams();
  const navigate = useNavigate();
  
  const [device, setDevice] = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  
  // Rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  
  const token = localStorage.getItem('platform_token');

  const fetchDevice = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, capRes] = await Promise.all([
          platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}`),
          platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/capabilities`).catch(() => ({ data: { capabilities: [] } }))
      ]);
      setDevice(res.data.device);
      setCapabilities(capRes.data.capabilities || []);
    } catch (err) {
      console.error("Failed to load device details", err);
      if (err.response?.status === 404) {
         setError("Device not found.");
      } else if (err.response?.status === 403) {
         setError("You don't have access to this workspace.");
      } else {
         setError("Unable to load device details.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Live SSE Status Updates
  useSSE(workspaceId && deviceId ? `/api/workspaces/${workspaceId}/devices/live-status?deviceId=${deviceId}` : null, token, (event, eventType) => {
    if (eventType === 'device-status') {
        if (!event || !event.deviceId || !event.status) return;
        setDevice(prev => {
            if (!prev || prev.device_id !== event.deviceId) return prev;
            return { ...prev, status: event.status, last_seen: event.lastSeen };
        });
    } else if (eventType === 'command-status') {
        window.dispatchEvent(new CustomEvent('device-command-update', { detail: event }));
    } else if (eventType === 'capability-update') {
        if (event.deviceId) {
            platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/capabilities`)
                .then(res => setCapabilities(res.data.capabilities || []))
                .catch(err => console.error("Failed to refresh capabilities", err));
        }
    }
  });

  useEffect(() => {
    fetchDevice();
  }, [workspaceId, deviceId]);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ message: msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`);
    } catch (err) {
      showToast(`Unable to copy ${label}.`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently remove '${device.name}'? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await platformClient.delete(`/workspaces/${workspaceId}/devices/${deviceId}`);
      navigate(`/workspaces/${workspaceId}/devices`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove device', 'error');
      setIsDeleting(false);
    }
  };

  const handleRename = async () => {
    if (!editNameValue.trim() || editNameValue.trim() === device.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      const res = await platformClient.put(`/workspaces/${workspaceId}/devices/${deviceId}`, {
        name: editNameValue.trim()
      });
      setDevice(res.data.device);
      setIsEditingName(false);
      showToast('Device renamed successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to rename device', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  const [expandedTopics, setExpandedTopics] = useState({});
  const toggleTopic = (key) => setExpandedTopics(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="flex-column flex-center p-12" style={{ minHeight: '400px' }}>
         <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin"></div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="glass-card flex-column flex-center p-12 text-center" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <AlertCircle size={40} className="text-red mb-4" />
        <h3 className="font-bold text-lg mb-2">{error || "Device not found."}</h3>
        <p className="text-muted mb-6">The device may have been removed or you don't have access.</p>
        <Button variant="primary" onClick={() => navigate(`/workspaces/${workspaceId}/devices`)}>Back to Devices</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <style>{`
        .topic-box { background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-family: monospace; color: #0f172a; word-break: break-all; font-size: 0.875rem; }
        @media (max-width: 900px) { .mqtt-expand-grid { grid-template-columns: 1fr !important; } .mqtt-expand-grid > div:first-child { border-right: none !important; border-bottom: 1px solid #e5e7eb; } }
      `}</style>

      {toastMsg && <Toast message={toastMsg.message} type={toastMsg.type} />}

      {/* Breadcrumbs & Header */}
      <div className="mb-6">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            icon={ArrowLeft} 
            onClick={() => navigate(`/workspaces/${workspaceId}/devices`)}
            className="pl-0 hover:bg-transparent hover:text-primary"
          >
            Back to Devices
          </Button>
        </div>
        
        <div className="flex-between flex-wrap gap-4">
          <div>
            <div className="flex-align gap-3 mb-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    className="ds-input py-1 px-2 text-xl font-bold h-auto w-[250px]"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <Button variant="primary" size="sm" icon={Check} onClick={handleRename} loading={isSavingName} className="p-1.5" />
                  <Button variant="secondary" size="sm" icon={X} onClick={() => setIsEditingName(false)} disabled={isSavingName} className="p-1.5" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-main tracking-tight">{device.name}</h1>
                  <button 
                    onClick={() => { setEditNameValue(device.name); setIsEditingName(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    title="Rename Device"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
              
              {!isEditingName && (
                <span className={`badge ${device.status?.toUpperCase() === 'ONLINE' ? 'badge-success' : 'badge-neutral'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                  {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
            <p className="font-mono text-sm text-muted">{device.device_id}</p>
          </div>
          <div>
            <Button variant="danger" icon={Trash2} onClick={handleDelete} loading={isDeleting}>Remove Device</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* Row 1: Info and Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-panel p-6 flex-column border border-gray-100">
            <h3 className="font-bold text-main mb-6 flex-align gap-2">
              <Server size={18} className="text-blue" />
              Device Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <div className="text-xs text-muted font-medium mb-1">Device Name</div>
                <div className="font-medium text-main">{device.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-1">Device Type</div>
                <div className="font-medium text-main">{device.device_type || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-1">Device ID</div>
                <div className="font-mono text-sm text-main">{device.device_id}</div>
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-1">Created At</div>
                <div className="font-medium text-main">{new Date(device.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1 glass-panel p-6 flex-column border border-gray-100">
            <h3 className="font-bold text-main mb-6 flex-align gap-2">
              <CheckCircle2 size={18} className="text-blue" />
              Status
            </h3>
            
            <div className="flex-align gap-4 mb-6">
              <div className={`ds-icon-box ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-green-light' : 'bg-gray-100'}`} style={{ width: '48px', height: '48px' }}>
                <Activity size={24} className={device.status?.toUpperCase() === 'ONLINE' ? 'text-green' : 'text-muted'} />
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-1">Current State</div>
                <div className={`font-bold text-lg ${device.status?.toUpperCase() === 'ONLINE' ? 'text-green' : 'text-main'}`}>
                  {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-blue-light" style={{ width: '48px', height: '48px' }}>
                <Clock size={24} className="text-blue" />
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-1">Last Communication</div>
                <div className="font-bold text-main">{formatLastSeen(device.last_seen)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Commands */}
        <div className="glass-panel p-6 border border-gray-100">
          <DeviceCommandPanel 
            workspaceId={workspaceId} 
            deviceId={deviceId} 
            capabilities={capabilities}
            managedActions={[]} // Removed managed actions logic
            deviceStatus={device.status}
            readOnly={true}
          />
        </div>

        {/* Row 3: MQTT Documentation */}
        <div className="glass-panel p-6 flex-column border border-gray-100">
          <h3 className="font-bold text-main mb-2 flex-align gap-2">
            <Terminal size={18} className="text-blue" />
            MQTT Protocol Reference
          </h3>
          <p className="text-sm text-muted mb-6">
            Use these MQTT topics to interact with your device. Connect with <strong className="text-gray-700">Device ID</strong> as the username and the <strong className="text-gray-700">Secret Key</strong> (shown at device creation) as the password.
          </p>
          
          {(() => {
            const topics = [
              {
                key: 'data',
                direction: 'publish',
                title: 'Telemetry Data',
                topic: `devices/${device.device_id}/data`,
                badge: 'PUBLISH',
                badgeColor: 'bg-green-100 text-green-700 border-green-200',
                icon: <Upload size={14} />,
                summary: 'Send sensor readings and telemetry data to the platform.',
                description: 'Publish a JSON object containing a device_id field and a nested data object with your telemetry fields. Fields are auto-discovered and tracked by the platform.',
                payloadExample: `{
  "device_id": "${device.device_id}",
  "data": {
    "temperature": 25.4,
    "humidity": 60,
    "fan_speed": 2,
    "light_status": "ON"
  }
}`,
                notes: [
                  'The device_id in the payload must match the topic device_id.',
                  'All numeric, string, and boolean values in data are auto-discovered.',
                  'Sending telemetry automatically marks the device as ONLINE.',
                  'Nested objects are flattened using dot notation (e.g. env.temp).',
                ]
              },
              {
                key: 'status',
                direction: 'publish',
                title: 'Connection Status',
                topic: `devices/${device.device_id}/status`,
                badge: 'PUBLISH',
                badgeColor: 'bg-green-100 text-green-700 border-green-200',
                icon: <Upload size={14} />,
                summary: 'Report device connection state to the platform.',
                description: 'Publish to this topic to explicitly update the device status. Use this on startup (online) and during graceful shutdown (offline). Status values are case-insensitive.',
                payloadExample: `// When connecting:
{
  "device_id": "${device.device_id}",
  "status": "online"
}

// When disconnecting:
{
  "device_id": "${device.device_id}",
  "status": "offline"
}`,
                notes: [
                  'Valid values: "online" or "offline" (case-insensitive).',
                  'device_id must match the topic device_id.',
                  'Set up an MQTT LWT (Last Will & Testament) on this topic for automatic offline detection.',
                ]
              },
              {
                key: 'command',
                direction: 'subscribe',
                title: 'Incoming Commands',
                topic: `devices/${device.device_id}/command`,
                badge: 'SUBSCRIBE',
                badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
                icon: <Download size={14} />,
                summary: 'Subscribe to receive commands sent from the platform or users.',
                description: 'The platform will publish command messages to this topic when an action is triggered. Your device must subscribe and process the payload, then send an acknowledgement back.',
                payloadExample: `// Message received from platform:
{
  "command_id": "cmd-uuid",
  "correlation_id": "corr-uuid",
  "command_type": "SET_FAN_SPEED",
  "parameters": {
    "speed": 2
  },
  "sent_at": "2026-09-10T05:00:00Z"
}`,
                notes: [
                  'Always read correlation_id — you need it when sending acknowledgements.',
                  'Process the command_type and parameters in your firmware.',
                  'After execution, publish an ack back to the command/ack topic.',
                ]
              },
              {
                key: 'command_ack',
                direction: 'publish',
                title: 'Command Acknowledgement',
                topic: `devices/${device.device_id}/command/ack`,
                badge: 'PUBLISH',
                badgeColor: 'bg-green-100 text-green-700 border-green-200',
                icon: <Upload size={14} />,
                summary: 'Acknowledge execution of a command back to the platform.',
                description: 'After receiving and processing a command, publish an acknowledgement to this topic. The platform tracks command lifecycle (ACKNOWLEDGED → COMPLETED or FAILED) based on your ack.',
                payloadExample: `// On successful execution:
{
  "command_id": "cmd-uuid",
  "correlation_id": "corr-uuid",
  "status": "COMPLETED",
  "result": { "actual_speed": 2 }
}

// On failure:
{
  "command_id": "cmd-uuid",
  "correlation_id": "corr-uuid",
  "status": "FAILED",
  "error_code": "MOTOR_FAULT",
  "error_message": "Motor driver error"
}`,
                notes: [
                  'Valid status values: ACKNOWLEDGED, COMPLETED, FAILED, REJECTED.',
                  'correlation_id must match exactly the value received in the command.',
                  'ACKNOWLEDGED means you received it; COMPLETED means it ran successfully.',
                  'Include result or error_code for richer command history.',
                ]
              },
              {
                key: 'capabilities',
                direction: 'publish',
                title: 'Device Capabilities',
                topic: `devices/${device.device_id}/capabilities`,
                badge: 'PUBLISH',
                badgeColor: 'bg-green-100 text-green-700 border-green-200',
                icon: <Upload size={14} />,
                summary: 'Register device capabilities and actions with the platform.',
                description: 'Publish an array of capability objects to register what your device can do. This populates the Device Actions panel on the platform and defines the controls available to users. Publish on startup or whenever capabilities change.',
                payloadExample: `[
  {
    "label": "Fan Control",
    "actions": [
      {
        "name": "SET_FAN_SPEED",
        "label": "Set Fan Speed",
        "description": "Set the fan speed (0=off, 1=low, 2=med, 3=high)",
        "parameters": {
          "speed": {
            "type": "number",
            "min": 0,
            "max": 3,
            "step": 1,
            "required": true
          }
        }
      }
    ],
    "state_mapping": {
      "path": "fan_speed",
      "unit": "level"
    }
  }
]`,
                notes: [
                  'Publish on device startup to ensure capabilities are always in sync.',
                  'Parameter types: number, string, boolean, enum.',
                  'state_mapping.path must match the key you publish in telemetry data.',
                  'Changes to capabilities are detected automatically — no need to delete old ones.',
                ]
              },
            ];

            return (
              <div className="flex flex-col gap-3">
                {topics.map((t) => {
                  const isOpen = !!expandedTopics[t.key];
                  return (
                    <div key={t.key} style={{ border: `1px solid ${isOpen ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: '10px', overflow: 'hidden', transition: 'all 0.2s', background: isOpen ? '#fff' : '#fff', boxShadow: isOpen ? '0 1px 6px rgba(59,130,246,0.08)' : 'none' }}>
                      {/* ─── Header ─────────────────────────────────── */}
                      <div
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', cursor: 'pointer', background: isOpen ? '#f8faff' : '#fff' }}
                        onClick={() => toggleTopic(t.key)}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Badge */}
                        <span style={{ flexShrink: 0, marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '6px', border: '1px solid' }} className={t.badgeColor}>
                          {t.icon}{t.badge}
                        </span>
                        {/* Title + topic path + summary */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{t.title}</span>
                            <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', userSelect: 'all' }}>{t.topic}</code>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{t.summary}</div>
                        </div>
                        {/* Actions */}
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopy(t.topic, t.title + ' Topic'); }}
                            style={{ padding: '6px', borderRadius: '6px', color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            className="hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title="Copy topic"
                          >
                            <Copy size={14} />
                          </button>
                          <div style={{ padding: '6px', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* ─── Expanded Body ───────────────────────────── */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', minWidth: 0 }} className="mqtt-expand-grid">
                            {/* Left: Description + Notes */}
                            <div style={{ padding: '20px', borderRight: '1px solid #e5e7eb' }}>
                              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.65', marginBottom: '16px' }}>{t.description}</p>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Notes</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {t.notes.map((note, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
                                    <span style={{ flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>{i + 1}</span>
                                    <span style={{ lineHeight: '1.5' }}>{note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Right: Payload Example */}
                            <div style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payload Example</span>
                                <button
                                  onClick={() => handleCopy(t.payloadExample, 'Payload')}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}
                                  className="hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                              <pre style={{ background: '#0d1117', color: '#4ade80', fontSize: '11.5px', borderRadius: '8px', padding: '14px 16px', overflow: 'auto', lineHeight: '1.7', fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace', border: '1px solid #1f2937', margin: 0 }}>{t.payloadExample}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
