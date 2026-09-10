import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { platformClient } from '../api/client';
import { 
  ArrowLeft, Server, Activity, Clock, Trash2, AlertCircle, CheckCircle2, Copy, Terminal, Edit2, Check, X, ChevronDown, ChevronRight, Upload, Download, Book, Code2, Package
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
  const [sdkTab, setSdkTab] = useState('python');

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

        {/* Row 2: Capabilities / Commands */}
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
        {/* Row 3: SDK & Device Library */}
        {(() => {
          const did = device.device_id;

          // ── Clean USAGE examples (what users write) ──────────────────
          const pythonExample = `from mydevice import MyDevice
import time

device = MyDevice("${did}", "YOUR_SECRET_KEY")

# Register a capability with an action
cap = device.add_capability("motor_control", "Motor Control",
                            "Control actuators", "motor_status.fan_speed")
cap.add_action("SET_FAN_SPEED", "Set Fan Speed", "0=off, 3=high",
               speed={"type": "number", "min": 0, "max": 3, "step": 1, "required": True})

# Handle incoming commands
@device.on_command("SET_FAN_SPEED")
def handle_fan(params):
    print(f"Fan speed -> {params['speed']}")
    return True   # True = COMPLETED, False = FAILED

# Connect to MyDevice platform
device.connect()

# Send telemetry in a loop
try:
    while True:
        device.send("sensor_1", temperature=25.4, humidity=60)
        device.send("motor_status", fan_speed=2, pump_active=True)
        time.sleep(5)
except KeyboardInterrupt:
    device.disconnect()
`;

          const arduinoExample = `#include <WiFi.h>          // Use <ESP8266WiFi.h> for ESP8266
#include "MyDevice.h"      // Place MyDevice.h in sketch folder or Arduino libraries

const char* WIFI_SSID  = "YOUR_WIFI_SSID";
const char* WIFI_PASS  = "YOUR_WIFI_PASSWORD";

WiFiClient wifiClient;
MyDevice   device("${did}", "YOUR_SECRET_KEY", wifiClient);

void setup() {
    Serial.begin(115200);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\\nWiFi connected");

    // Register capabilities
    device.addCapability("motor_control", "Motor Control",
                         "Control actuators", "motor_status.fan_speed");
    device.addAction("motor_control", "SET_FAN_SPEED", "Set Fan Speed", "0=off, 3=high");
    device.addNumberParam("speed", 0, 3, 1);

    // Handle commands
    device.onCommand("SET_FAN_SPEED", [](JsonObject p) {
        int speed = p["speed"];
        Serial.printf("Fan speed -> %d\\n", speed);
        return true;   // true = COMPLETED, false = FAILED
    });

    device.begin();
}

void loop() {
    device.loop();

    // Send telemetry every 5 seconds
    static unsigned long lastMs = 0;
    if (millis() - lastMs > 5000) {
        lastMs = millis();
        device.addField("temperature", 25.4f);
        device.addField("humidity", 60);
        device.send("sensor_1");
    }
}
`;

          const nodejsExample = `const { MyDevice } = require('./mydevice-sdk');

const device = new MyDevice('${did}', 'YOUR_SECRET_KEY');

// Register capabilities
device.addCapability('motor_control', 'Motor Control',
                     'Control actuators', 'motor_status.fan_speed');
device.addAction('motor_control', 'SET_FAN_SPEED', 'Set Fan Speed', '0=off, 3=high', {
    speed: { type: 'number', min: 0, max: 3, step: 1, required: true }
});

// Handle commands
device.onCommand('SET_FAN_SPEED', (params) => {
    console.log('Fan speed ->', params.speed);
    return true;   // true = COMPLETED, false = FAILED
});

// Connect
device.connect();

// Send telemetry every 5 seconds
setInterval(() => {
    device.send('sensor_1', { temperature: 25.4, humidity: 60 });
    device.send('motor_status', { fan_speed: 2, pump_active: true });
}, 5000);
`;

          const sdkConfigs = {
            python: {
              label: 'Python',
              icon: '🐍',
              code: pythonExample,
              exampleFilename: `example_${did.toLowerCase()}.py`,
              libraryFilename: 'mydevice.py',
              libraryUrl: '/sdk/mydevice.py',
              install: 'pip install paho-mqtt',
              run: `python example_${did.toLowerCase()}.py`,
              importLine: 'from mydevice import MyDevice',
              notes: [
                'Download mydevice.py and place it next to your script.',
                'Requires paho-mqtt: pip install paho-mqtt',
                'Replace YOUR_SECRET_KEY with the key shown at device creation.',
                'Works on Raspberry Pi, desktop, or any Python 3.7+ environment.',
              ],
              apiRef: [
                { fn: 'MyDevice(id, key)', desc: 'Create device instance' },
                { fn: 'device.connect()', desc: 'Connect to the platform' },
                { fn: 'device.send(source, **fields)', desc: 'Send telemetry data' },
                { fn: 'device.add_capability(...)', desc: 'Register a capability group' },
                { fn: 'cap.add_action(...)', desc: 'Add an action to a capability' },
                { fn: '@device.on_command(type)', desc: 'Decorator to handle a command' },
                { fn: 'device.disconnect()', desc: 'Graceful shutdown' },
              ]
            },
            arduino: {
              label: 'Arduino / C++',
              icon: '⚙️',
              code: arduinoExample,
              exampleFilename: `example_${did.toLowerCase()}.ino`,
              libraryFilename: 'MyDevice.h',
              libraryUrl: '/sdk/MyDevice.h',
              install: 'PubSubClient + ArduinoJson (via Library Manager)',
              run: 'Flash via Arduino IDE or PlatformIO',
              importLine: '#include "MyDevice.h"',
              notes: [
                'Download MyDevice.h and place in sketch folder or Arduino/libraries/MyDevice/.',
                'Install PubSubClient + ArduinoJson via Arduino Library Manager.',
                'Works on ESP32 and ESP8266 (change WiFi.h to ESP8266WiFi.h).',
                'Replace WiFi credentials and YOUR_SECRET_KEY before flashing.',
              ],
              apiRef: [
                { fn: 'MyDevice(id, key, client)', desc: 'Create device instance' },
                { fn: 'device.begin()', desc: 'Connect (call in setup())' },
                { fn: 'device.loop()', desc: 'Process MQTT (call in loop())' },
                { fn: 'device.addField(key, val)', desc: 'Queue a telemetry field' },
                { fn: 'device.send(source)', desc: 'Publish queued fields' },
                { fn: 'device.addCapability(...)', desc: 'Register a capability' },
                { fn: 'device.onCommand(type, fn)', desc: 'Handle a command' },
              ]
            },
            nodejs: {
              label: 'Node.js',
              icon: '🟩',
              code: nodejsExample,
              exampleFilename: `example_${did.toLowerCase()}.js`,
              libraryFilename: 'mydevice-sdk.js',
              libraryUrl: '/sdk/mydevice-sdk.js',
              install: 'npm install mqtt',
              run: `node example_${did.toLowerCase()}.js`,
              importLine: "const { MyDevice } = require('./mydevice-sdk')",
              notes: [
                'Download mydevice-sdk.js and place it in your project folder.',
                'Requires mqtt package: npm install mqtt',
                'Replace YOUR_SECRET_KEY with the key shown at device creation.',
                'Use process.env.SECRET_KEY in production to avoid hardcoding.',
              ],
              apiRef: [
                { fn: "new MyDevice(id, key)", desc: 'Create device instance' },
                { fn: 'device.connect()', desc: 'Connect to the platform' },
                { fn: 'device.send(source, fields)', desc: 'Send telemetry data' },
                { fn: 'device.addCapability(...)', desc: 'Register a capability' },
                { fn: 'device.addAction(...)', desc: 'Add an action' },
                { fn: 'device.onCommand(type, fn)', desc: 'Handle a command' },
                { fn: 'device.disconnect()', desc: 'Graceful shutdown' },
              ]
            },
          };

          const cfg = sdkConfigs[sdkTab];

          const handleDownloadExample = () => {
            const blob = new Blob([cfg.code], { type: 'text/plain' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = cfg.exampleFilename; a.click();
            URL.revokeObjectURL(url);
            showToast(`Downloaded ${cfg.exampleFilename}`);
          };

          const handleDownloadLibrary = () => {
            const a = document.createElement('a');
            a.href = cfg.libraryUrl;
            a.download = cfg.libraryFilename;
            a.click();
            showToast(`Downloaded ${cfg.libraryFilename}`);
          };

          return (
            <div className="glass-panel p-6 border border-gray-100">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h3 className="font-bold text-main flex-align gap-2 mb-1">
                    <Package size={18} className="text-blue" />
                    Device SDK & Library
                  </h3>
                  <p className="text-sm text-muted">Import the MyDevice library and use simple functions — no boilerplate needed. Download the library + example pre-filled with your Device ID.</p>
                </div>
              </div>

              {/* Language Tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
                {Object.entries(sdkConfigs).map(([key, c]) => (
                  <button
                    key={key}
                    onClick={() => setSdkTab(key)}
                    style={{
                      padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      borderBottom: sdkTab === key ? '2px solid #2563eb' : '2px solid transparent',
                      color: sdkTab === key ? '#2563eb' : '#6b7280',
                      marginBottom: '-1px', transition: 'all 0.15s', borderRadius: '0',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Install + Import bar */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '220px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Install</span>
                  <code style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', flex: 1 }}>{cfg.install}</code>
                  <button onClick={() => handleCopy(cfg.install, 'Install command')} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: '4px' }} className="hover:text-gray-600 transition-colors"><Copy size={13} /></button>
                </div>
                <div style={{ flex: 1, minWidth: '220px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Import</span>
                  <code style={{ fontSize: '12px', fontFamily: 'monospace', color: '#14532d', flex: 1 }}>{cfg.importLine}</code>
                  <button onClick={() => handleCopy(cfg.importLine, 'Import line')} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: '4px' }} className="hover:text-gray-600 transition-colors"><Copy size={13} /></button>
                </div>
              </div>

              {/* Main two-column area: Code + Sidebar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }} className="sdk-grid">
                <style>{`.sdk-grid { @media (max-width: 900px) { grid-template-columns: 1fr !important; } }`}</style>

                {/* Code Block */}
                <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1f2937' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#161b22', padding: '10px 16px', borderBottom: '1px solid #21262d', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Code2 size={14} style={{ color: '#58a6ff' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#c9d1d9', fontFamily: 'monospace' }}>{cfg.exampleFilename}</span>
                      <span style={{ fontSize: '10px', color: '#8b949e', fontStyle: 'italic' }}>Usage Example</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleCopy(cfg.code, 'Example code')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#8b949e', background: '#21262d', border: '1px solid #30363d', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}
                        className="hover:bg-gray-700 hover:text-gray-200 transition-colors"
                      >
                        <Copy size={11} /> Copy
                      </button>
                      <button
                        onClick={handleDownloadExample}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#c9d1d9', background: '#21262d', border: '1px solid #30363d', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}
                        className="hover:bg-gray-700 hover:text-gray-200 transition-colors"
                      >
                        <Download size={11} /> Example
                      </button>
                      <button
                        onClick={handleDownloadLibrary}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#ffffff', background: '#2563eb', border: '1px solid #1d4ed8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                        className="hover:bg-blue-700 transition-colors"
                      >
                        <Download size={11} /> {cfg.libraryFilename}
                      </button>
                    </div>
                  </div>
                  <pre style={{ background: '#0d1117', color: '#e6edf3', fontSize: '11.5px', padding: '16px', overflow: 'auto', lineHeight: '1.7', fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace', margin: 0, maxHeight: '480px' }}>{cfg.code}</pre>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Setup Notes */}
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Book size={12} /> Setup Guide
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cfg.notes.map((note, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#0c4a6e' }}>
                          <span style={{ flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%', background: '#0ea5e9', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>{i + 1}</span>
                          <span style={{ lineHeight: '1.5' }}>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Reference */}
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>API Reference</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cfg.apiRef.map((ref, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                          <code style={{ flexShrink: 0, fontSize: '11px', fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e9d5ff', whiteSpace: 'nowrap' }}>{ref.fn}</code>
                          <span style={{ color: '#6b7280', lineHeight: '1.5' }}>{ref.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Start */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Quick Start</div>
                    {[
                      `Download ${cfg.libraryFilename} using the button above.`,
                      `Download the example file (pre-filled with your Device ID).`,
                      'Replace YOUR_SECRET_KEY with your device secret key.',
                      `Run: ${cfg.run}`,
                      'Your device appears Online — add your real sensor code!',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: '#78350f', marginBottom: i < 4 ? '8px' : 0 }}>
                        <span style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', background: '#fbbf24', color: '#78350f', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                        <span style={{ lineHeight: '1.5' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Row 4: MQTT Protocol Reference */}
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
