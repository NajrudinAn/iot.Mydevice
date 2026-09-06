import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { platformClient } from '../api/client';
import { 
  ArrowLeft, Server, Activity, Clock, Trash2, AlertCircle, CheckCircle2, Copy, Terminal
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
  const [managedActions, setManagedActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const token = localStorage.getItem('platform_token');

  const fetchDevice = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, capRes, maRes] = await Promise.all([
          platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}`),
          platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/capabilities`).catch(() => ({ data: { capabilities: [] } })),
          platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/managed-actions`).catch(() => ({ data: { actions: [] } }))
      ]);
      setDevice(res.data.device);
      setCapabilities(capRes.data.capabilities || []);
      setManagedActions(maRes.data.actions || []);
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
        // We broadcast this as a custom event so the child panel can listen independently without lifting too much state
        window.dispatchEvent(new CustomEvent('device-command-update', { detail: event }));
    } else if (eventType === 'capability-update') {
        if (event.deviceId) {
            // Re-fetch capabilities on update
            platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/capabilities`)
                .then(res => setCapabilities(res.data.capabilities || []))
                .catch(err => console.error("Failed to refresh capabilities", err));
        }
    } else if (eventType === 'action-update' || eventType === 'action-assignment-update') {
        // Re-fetch managed actions on update
        platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/managed-actions`)
            .then(res => setManagedActions(res.data.actions || []))
            .catch(err => console.error("Failed to refresh managed actions", err));
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
              <h1 className="text-2xl font-bold text-main tracking-tight">{device.name}</h1>
              <span className={`badge ${device.status?.toUpperCase() === 'ONLINE' ? 'badge-success' : 'badge-neutral'}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="font-mono text-sm text-muted">{device.device_id}</p>
          </div>
          <div>
            <Button variant="danger" icon={Trash2} onClick={handleDelete} loading={isDeleting}>Remove Device</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
            <Activity size={16} /> Overview
        </button>
        <button
            onClick={() => setActiveTab('commands')}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'commands' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
            <Terminal size={16} /> Commands
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (Left Col) */}
        <div className={`md:col-span-2 flex-column gap-6 ${activeTab === 'overview' ? 'flex' : 'hidden'}`}>
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex-column">
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

          <div className="bg-white rounded-xl border border-gray-100 p-6 flex-column">
            <h3 className="font-bold text-main mb-4 flex-align gap-2">
              <Activity size={18} className="text-blue" />
              MQTT Configuration
            </h3>
            <p className="text-sm text-muted mb-6">
              Use these topics to interact with this device over MQTT. Authentication requires the Device ID as username and the Secret Key (generated at creation) as the password.
            </p>
            
            <div className="flex-column gap-5">
              <div>
                <div className="text-sm font-medium text-main mb-1.5">Telemetry Data Topic</div>
                <div className="topic-box flex-between align-center">
                  <span>devices/{device.device_id}/data</span>
                  <Button variant="icon" onClick={() => handleCopy(`devices/${device.device_id}/data`, 'Data Topic')} icon={Copy} title="Copy Topic" />
                </div>
                <div className="text-xs text-muted mt-1.5">Publish JSON telemetry payloads here.</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-main mb-1.5">Status Topic</div>
                <div className="topic-box flex-between align-center">
                  <span>devices/{device.device_id}/status</span>
                  <Button variant="icon" onClick={() => handleCopy(`devices/${device.device_id}/status`, 'Status Topic')} icon={Copy} title="Copy Topic" />
                </div>
                <div className="text-xs text-muted mt-1.5">Publish {"{"}"status": "online"{"}"} to update connection state.</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-main mb-1.5">Command Topic</div>
                <div className="topic-box flex-between align-center">
                  <span>devices/{device.device_id}/command</span>
                  <Button variant="icon" onClick={() => handleCopy(`devices/${device.device_id}/command`, 'Command Topic')} icon={Copy} title="Copy Topic" />
                </div>
                <div className="text-xs text-muted mt-1.5">Subscribe to receive remote commands from the platform.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Commands Tab Content (if active) */}
        <div className={`md:col-span-2 ${activeTab === 'commands' ? 'block' : 'hidden'}`}>
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              {activeTab === 'commands' && (
                <DeviceCommandPanel 
                  workspaceId={workspaceId} 
                  deviceId={deviceId} 
                  capabilities={capabilities}
                  managedActions={managedActions}
                  deviceStatus={device.status}
                />
              )}
            </div>
        </div>

        {/* Sidebar (Right Col) */}
        <div className={`flex-column gap-6 ${activeTab === 'commands' ? 'md:col-span-1' : 'md:col-span-1'}`}>
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex-column">
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
      </div>
    </div>
  );
}
