import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { platformClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';
import { 
  Server, Copy, Check, Plus, RefreshCw, X, AlertCircle, 
  Search, Info, Filter, CheckCircle2, ChevronRight, Activity
} from 'lucide-react';
import Button from '../components/ui/Button';

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

export default function WorkspaceDevices() {
  const { workspaceId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); 
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('ESP32');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState(null);
  
  // Credentials Modal State
  const [createdDevice, setCreatedDevice] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformClient.get(`/workspaces/${workspaceId}/devices`);
      setDevices(res.data.devices || []);
    } catch (err) {
      console.error("Failed to load devices", err);
      if (err.response?.status === 403 || err.response?.status === 404) {
          setError("You don't have access to this workspace.");
      } else {
          setError('Unable to load devices.');
      }
    } finally {
      setLoading(false);
    }
  };


  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event, eventType) => {
    if (eventType !== 'device-status') return;
    if (!event || !event.deviceId || !event.status) return;
    
    setDevices(prev => {
      return prev.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );
    });
  });

  useEffect(() => {
    fetchDevices();
  }, [workspaceId]);

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

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    
    setIsSubmitting(true);
    setCreationError(null);
    try {
      const res = await platformClient.post(`/workspaces/${workspaceId}/devices`, { 
        name: newDeviceName.trim(),
        device_type: newDeviceType 
      });
      
      setCreatedDevice(res.data.device);
      fetchDevices(); 
    } catch (err) {
      setCreationError(err.response?.data?.message || 'Unable to create device. Check if the name or ID already exists.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setShowAddModal(false);
    setNewDeviceName('');
    setNewDeviceType('ESP32');
    setCreationError(null);
    setCreatedDevice(null);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.device_type && d.device_type.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' ? true :
                            statusFilter === 'Online' ? d.status?.toUpperCase() === 'ONLINE' :
                            d.status?.toUpperCase() !== 'ONLINE';
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest
  }, [devices, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.status?.toUpperCase() === 'ONLINE').length,
    offline: devices.filter(d => d.status?.toUpperCase() !== 'ONLINE').length
  }), [devices]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <style>{`
        .device-card-mobile { border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: white; transition: box-shadow 0.2s; }
        .device-card-mobile:hover { box-shadow: var(--shadow-sm); }
        .secret-box { background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-family: monospace; color: #0f172a; word-break: break-all; }
      `}</style>

      {toastMsg && <Toast message={toastMsg.message} type={toastMsg.type} />}

      <div className="flex-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-main mb-1 tracking-tight">Devices</h1>
          <p className="text-muted text-sm">Manage the IoT devices connected to this workspace.</p>
        </div>
        <div className="flex-align gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchDevices} loading={loading}>Refresh</Button>
          <Button variant="primary" icon={Plus} onClick={() => setShowAddModal(true)}>Add Device</Button>
        </div>
      </div>

      {error ? (
        <div className="glass-card flex-column flex-center p-12 text-center">
          <AlertCircle size={40} className="text-red mb-4" />
          <h3 className="font-bold text-lg mb-2">{error}</h3>
          <p className="text-muted mb-6">Please check your permissions and try again.</p>
          {error.includes("access") ? (
             <Button variant="primary" onClick={() => navigate('/portal')}>Back to Portal</Button>
          ) : (
             <Button variant="secondary" onClick={fetchDevices}>Retry</Button>
          )}
        </div>
      ) : (
        <>
          {/* Compact Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass-card flex-align gap-4 p-4">
              <div className="ds-icon-box bg-blue-light text-blue">
                <Server size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Total Devices</div>
                <div className="text-2xl font-bold leading-none">{loading ? '-' : stats.total}</div>
              </div>
            </div>
            
            <div className="glass-card flex-align gap-4 p-4">
              <div className="ds-icon-box bg-green-light text-green">
                <Activity size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Online</div>
                <div className="text-2xl font-bold leading-none">{loading ? '-' : stats.online}</div>
              </div>
            </div>
            
            <div className="glass-card flex-align gap-4 p-4">
              <div className="ds-icon-box bg-gray-100 text-muted">
                <Server size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Offline</div>
                <div className="text-2xl font-bold leading-none">{loading ? '-' : stats.offline}</div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6 bg-white p-3 rounded-xl border border-gray-100">
            <div className="flex-1 min-w-[260px] max-w-md relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search devices..."
                className="form-input pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative min-w-[140px]">
              <select 
                className="form-select appearance-none pr-8" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Table / Empty State */}
          {loading && devices.length === 0 ? (
            <div className="glass-card p-8 flex-column gap-4">
               {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-md animate-pulse"></div>)}
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="glass-card flex-column flex-center text-center p-16">
              <div className="ds-icon-box bg-gray-50 mb-4" style={{ width: '64px', height: '64px', borderRadius: '50%' }}>
                  <Server size={32} className="text-muted" />
              </div>
              <h3 className="text-lg font-bold text-main mb-2">No devices found</h3>
              <p className="text-muted text-sm mb-6 max-w-md mx-auto">
                 {searchQuery ? "Try adjusting your search or filters." : "Add your first IoT device to start receiving data from your hardware."}
              </p>
              {!searchQuery && <Button variant="primary" icon={Plus} onClick={() => setShowAddModal(true)}>Add Device</Button>}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block glass-card p-0 overflow-hidden">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Device Name</th>
                        <th>Device ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.map(device => (
                        <tr key={device.id}>
                          <td>
                            <div className="font-semibold text-main">{device.name}</div>
                          </td>
                          <td>
                            <span className="font-mono text-xs text-muted bg-gray-50 px-2 py-1 rounded border border-gray-100">
                              {device.device_id}
                            </span>
                          </td>
                          <td className="text-muted">{device.device_type || 'Unknown'}</td>
                          <td>
                            <span className={`badge ${device.status?.toUpperCase() === 'ONLINE' ? 'badge-success' : 'badge-neutral'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                              {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="text-muted text-sm">
                            {formatLastSeen(device.last_seen)}
                          </td>
                          <td className="text-right">
                             <Button variant="secondary" size="sm" onClick={() => navigate(`/workspaces/${workspaceId}/devices/${device.id}`)}>
                               View &rarr;
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                 {filteredDevices.map(device => (
                    <div key={device.id} className="device-card-mobile flex-column gap-4">
                       <div className="flex-between align-start">
                          <div>
                            <div className="font-bold text-main mb-1">{device.name}</div>
                            <span className="font-mono text-xs text-muted bg-gray-50 px-1 rounded border border-gray-100">{device.device_id}</span>
                          </div>
                          <span className={`badge ${device.status?.toUpperCase() === 'ONLINE' ? 'badge-success' : 'badge-neutral'}`}>
                            {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
                          </span>
                       </div>
                       
                       <div className="text-sm text-muted flex-column gap-2">
                          <div className="flex-between"><span>Type</span> <span>{device.device_type}</span></div>
                          <div className="flex-between"><span>Last Seen</span> <span>{formatLastSeen(device.last_seen)}</span></div>
                       </div>
                       
                       <Button variant="secondary" className="w-full" onClick={() => navigate(`/workspaces/${workspaceId}/devices/${device.id}`)}>
                          View Device
                       </Button>
                    </div>
                 ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Device Modal */}
      {showAddModal && !createdDevice && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Device</h2>
              <Button variant="icon" icon={X} onClick={resetModal} />
            </div>
            
            <form onSubmit={handleCreateDevice} className="flex-column" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="modal-body flex-1 flex-column gap-4">
                {creationError && (
                  <div className="p-3 bg-red-light text-red text-sm rounded-md border border-red-100 flex-align gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{creationError}</span>
                  </div>
                )}
                
                <div className="form-group mb-0">
                  <label className="form-label">Device Name <span className="text-red">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Temperature Sensor 01" 
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    required
                    maxLength={50}
                    autoFocus
                  />
                  <div className="text-xs text-muted mt-1.5">A friendly name for this device.</div>
                </div>
                
                <div className="form-group mb-0 mt-4">
                  <label className="form-label">Device Type</label>
                  <select 
                    className="form-select"
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                  >
                    <option value="ESP32">ESP32</option>
                    <option value="ESP8266">ESP8266</option>
                    <option value="RASPBERRY_PI">Raspberry Pi</option>
                    <option value="ARDUINO">Arduino</option>
                    <option value="GENERIC">Generic MQTT Client</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="ghost" type="button" onClick={resetModal}>Cancel</Button>
                <Button variant="primary" type="submit" loading={isSubmitting}>Create Device</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Created / Credentials Modal */}
      {createdDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header border-none pb-0 pt-6 px-6">
              <div className="flex-align gap-3 text-green">
                <div className="ds-icon-box bg-green-light" style={{ width: '40px', height: '40px' }}>
                  <Check size={24} />
                </div>
                <h2 className="modal-title">Device Created</h2>
              </div>
            </div>
            
            <div className="modal-body px-6 pb-6">
              <p className="text-muted text-sm mb-6">
                Your device <strong className="text-main">{createdDevice.name}</strong> was registered successfully.
              </p>
              
              <div className="flex-column gap-5">
                <div>
                  <div className="text-sm font-semibold text-main mb-2">Device ID</div>
                  <div className="secret-box flex-between align-center">
                    <span>{createdDevice.device_id}</span>
                    <Button variant="icon" onClick={() => handleCopy(createdDevice.device_id, 'Device ID')} icon={Copy} title="Copy ID" />
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-semibold text-main mb-2">Secret Key</div>
                  <div className="secret-box flex-between align-center">
                    <span>{createdDevice.secret_key}</span>
                    <Button variant="icon" onClick={() => handleCopy(createdDevice.secret_key, 'Secret Key')} icon={Copy} title="Copy Secret" />
                  </div>
                </div>
                
                <div className="flex align-start gap-3 p-4 bg-orange-light text-orange-800 rounded-md border border-orange-200 mt-2 text-sm">
                  <AlertCircle size={20} className="flex-shrink-0 text-orange" />
                  <div style={{ color: '#9a3412' }}>
                    <strong className="block mb-1">IMPORTANT</strong> 
                    Save this Secret Key now. It is required for MQTT authentication and will not be shown again.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer px-6 pb-6 pt-4 bg-transparent">
              <Button variant="primary" onClick={resetModal} className="w-full justify-center">I have saved the credentials</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
