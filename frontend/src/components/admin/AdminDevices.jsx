import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../../api/client';
import { 
  Server, Copy, Check, Plus, RefreshCw, X, AlertCircle, 
  Search, Info, Trash2, Filter, MonitorPlay, Activity, CheckCircle2, MoreVertical
} from 'lucide-react';
import { SkeletonCard } from '../ui/Skeleton';
import Button from '../ui/Button';

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

// Toast notification component (reusing standard MyDevice styles if possible, else simple local)
const Toast = ({ message, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem',
    backgroundColor: type === 'success' ? '#10b981' : '#ef4444',
    color: 'white', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '0.75rem',
    zIndex: 9999, animation: 'slideUp 0.3s ease-out'
  }}>
    <CheckCircle2 size={18} />
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
  </div>
);

export default function AdminDevices() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Online, Offline
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('ESP32');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState(null);
  
  // Success state holding credentials
  const [createdDevice, setCreatedDevice] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appClient.get(`/applications/${applicationId}/devices`);
      setDevices(res.data.devices || []);
    } catch (err) {
      console.error("Failed to load devices", err);
      setError('Unable to load devices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [applicationId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`);
    } catch (err) {
      alert(`Unable to copy ${label}.`);
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    
    setIsSubmitting(true);
    setCreationError(null);
    try {
      const res = await appClient.post(`/applications/${applicationId}/devices/register`, { 
        name: newDeviceName.trim(),
        device_type: newDeviceType 
      });
      
      setCreatedDevice(res.data.device);
      fetchDevices(); // Refresh background list
    } catch (err) {
      setCreationError(err.response?.data?.message || 'Unable to create device.');
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

  const handleRemoveDevice = async (deviceId, deviceName) => {
    if (!window.confirm(`Are you sure you want to remove '${deviceName}' from this application?`)) return;
    try {
      await appClient.delete(`/applications/${applicationId}/devices/${deviceId}`);
      showToast('Device removed successfully');
      fetchDevices();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove device');
    }
  };

  // Derived state
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.device_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' ? true :
                            statusFilter === 'Online' ? d.status === 'ONLINE' :
                            d.status !== 'ONLINE';
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.status === 'ONLINE').length,
    offline: devices.filter(d => d.status !== 'ONLINE').length
  }), [devices]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      <style>{`
        .device-card { border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; background: white; transition: box-shadow 0.2s; }
        .device-card:hover { box-shadow: var(--shadow-sm); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 0.35rem; }
        .status-online { background-color: var(--green); box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
        .status-offline { background-color: var(--text-muted); }
        
        .secret-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-sm); padding: 1rem; position: relative; font-family: monospace; color: #0f172a; word-break: break-all; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-content { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 460px; box-shadow: var(--shadow-xl); overflow: hidden; }
        .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 1.5rem; }
        .modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border-color); background: #f8fafc; display: flex; justify-content: flex-end; gap: 0.75rem; }
        
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {toastMsg && <Toast message={toastMsg} />}

      {/* Header */}
      <div className="flex-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.025em', color: 'var(--text-main)' }}>Devices</h1>
          <p className="text-muted text-sm">Manage the IoT devices connected to this application.</p>
        </div>
        <div className="flex-align gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchDevices} loading={loading}>Refresh</Button>
          <Button icon={Plus} onClick={() => setShowAddModal(true)}>Add Device</Button>
        </div>
      </div>

      {error ? (
        <div className="ds-card flex-column flex-center p-8 text-center bg-white">
          <AlertCircle size={40} className="text-red mb-3" />
          <h3 className="font-bold text-lg mb-2">Unable to load devices</h3>
          <p className="text-muted text-sm mb-4">{error}</p>
          <Button onClick={fetchDevices}>Retry</Button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="ds-card bg-white" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
              <div className="text-2xl font-bold" style={{ lineHeight: 1 }}>{loading ? '-' : stats.total}</div>
              <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Total Devices</div>
            </div>
            <div className="ds-card bg-white" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div className="text-2xl font-bold" style={{ lineHeight: 1 }}>{loading ? '-' : stats.online}</div>
              <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Online</div>
            </div>
            <div className="ds-card bg-white" style={{ padding: '1.25rem', borderLeft: '4px solid #94a3b8' }}>
              <div className="text-2xl font-bold" style={{ lineHeight: 1 }}>{loading ? '-' : stats.offline}</div>
              <div className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Offline</div>
            </div>
          </div>

          {/* List Controls */}
          <div className="flex-between flex-wrap gap-4 mb-4">
            <div className="flex-align gap-2 flex-1" style={{ minWidth: '240px', maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search devices..."
                  className="ds-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.5rem', backgroundColor: 'white' }}
                />
              </div>
            </div>
            <div className="flex-align gap-2">
              <div style={{ position: 'relative' }}>
                <select 
                  className="ds-input" 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ paddingRight: '2rem', backgroundColor: 'white', appearance: 'none', minWidth: '120px' }}
                >
                  <option value="All">All Status</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
                <Filter size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Desktop Table (Hidden on mobile) */}
          <div className="hidden md:block ds-card overflow-hidden bg-white">
            <table className="w-full text-left border-collapse" style={{ fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                  <th className="font-semibold text-muted py-3 px-4">Device Name</th>
                  <th className="font-semibold text-muted py-3 px-4">Status</th>
                  <th className="font-semibold text-muted py-3 px-4">Device ID</th>
                  <th className="font-semibold text-muted py-3 px-4">Last Seen</th>
                  <th className="font-semibold text-muted py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-4"><div className="flex-center py-8"><RefreshCw size={24} className="animate-spin text-primary opacity-50" /></div></td></tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-muted">
                      {devices.length === 0 ? (
                        <>
                          <Server size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="mb-4">No devices yet. Add your first IoT device to connect it to this application.</p>
                          <Button onClick={() => setShowAddModal(true)}>+ Add Device</Button>
                        </>
                      ) : 'No devices found matching your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map(d => (
                    <tr key={d.device_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-main">
                        <div className="flex-align gap-2">
                          <MonitorPlay size={16} className="text-primary opacity-70" />
                          {d.name}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex-align" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          <span className={`status-dot ${d.status === 'ONLINE' ? 'status-online' : 'status-offline'}`}></span>
                          {d.status === 'ONLINE' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3 px-4"><code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{d.device_id}</code></td>
                      <td className="py-3 px-4 text-muted text-sm">{formatLastSeen(d.last_seen)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex-align justify-end gap-2">
                          <button className="text-sm font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors" onClick={() => navigate(`../device/${d.device_id}`)}>View</button>
                          <button className="text-muted hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors" title="Remove" onClick={() => handleRemoveDevice(d.device_id, d.name)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (Visible only on mobile) */}
          <div className="md:hidden flex flex-col gap-3">
             {loading ? (
               [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
             ) : filteredDevices.length === 0 ? (
                <div className="ds-card p-6 text-center text-muted bg-white">
                  {devices.length === 0 ? 'No devices yet. Add your first device.' : 'No devices found.'}
                </div>
             ) : (
               filteredDevices.map(d => (
                 <div key={d.device_id} className="device-card">
                   <div className="flex-between mb-3">
                     <div className="font-bold text-main">{d.name}</div>
                     <span className="flex-align" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                       <span className={`status-dot ${d.status === 'ONLINE' ? 'status-online' : 'status-offline'}`}></span>
                       {d.status === 'ONLINE' ? 'Online' : 'Offline'}
                     </span>
                   </div>
                   
                   <div className="flex flex-col gap-2 mb-4 text-sm">
                     <div className="flex-between">
                       <span className="text-muted">Device ID</span>
                       <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{d.device_id}</code>
                     </div>
                     <div className="flex-between">
                       <span className="text-muted">Last Seen</span>
                       <span className="text-main font-medium">{formatLastSeen(d.last_seen)}</span>
                     </div>
                   </div>
                   
                   <div className="flex gap-2">
                     <Button className="flex-1 justify-center" size="sm" onClick={() => navigate(`../device/${d.device_id}`)}>View Device</Button>
                     <Button variant="secondary" size="sm" className="px-2" onClick={() => handleRemoveDevice(d.device_id, d.name)}><Trash2 size={16} className="text-red-400" /></Button>
                   </div>
                 </div>
               ))
             )}
          </div>
        </>
      )}

      {/* Add Device / Credentials Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={!isSubmitting && !createdDevice ? resetModal : undefined}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-bold">{createdDevice ? 'Device Created Successfully' : 'Add New Device'}</h2>
              {!isSubmitting && <button className="text-muted hover:text-main" onClick={resetModal}><X size={20} /></button>}
            </div>
            
            {!createdDevice ? (
              // Creation Form
              <form onSubmit={handleCreateDevice}>
                <div className="modal-body">
                  {creationError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{creationError}</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-1.5 text-main">Device Name</label>
                    <input 
                      type="text" 
                      className="ds-input w-full bg-white" 
                      placeholder="e.g. Greenhouse Sensor 1"
                      value={newDeviceName}
                      onChange={e => setNewDeviceName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-sm font-semibold mb-1.5 text-main">Device Type</label>
                    <select 
                      className="ds-input w-full bg-white" 
                      value={newDeviceType}
                      onChange={e => setNewDeviceType(e.target.value)}
                    >
                      <option value="ESP32">ESP32</option>
                      <option value="RASPBERRY_PI">Raspberry Pi</option>
                      <option value="ARDUINO">Arduino</option>
                      <option value="GENERIC">Generic MQTT Client</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <Button type="button" variant="secondary" onClick={resetModal} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" loading={isSubmitting}>Create Device</Button>
                </div>
              </form>
            ) : (
              // Secure Credentials Display
              <div className="modal-body">
                <div className="flex-align gap-2 text-green font-semibold mb-4 bg-green-50 p-3 rounded border border-green-100">
                  <CheckCircle2 size={18} /> Device registered and assigned to application.
                </div>
                
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">Device ID</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={createdDevice.device_id} className="ds-input w-full bg-slate-50 text-main font-mono text-sm" />
                    <Button variant="secondary" icon={Copy} onClick={() => handleCopy(createdDevice.device_id, 'Device ID')} />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">Secret Key</label>
                  <div className="secret-box flex-between">
                    <span>{createdDevice.secret_key}</span>
                    <button className="text-primary hover:text-blue-700 bg-blue-50 p-1.5 rounded" onClick={() => handleCopy(createdDevice.secret_key, 'Secret Key')} title="Copy Secret Key">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 text-amber-700 bg-amber-50 p-3 rounded text-sm border border-amber-200">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <div>
                    <strong>IMPORTANT:</strong> Save this Secret Key securely right now. It is required for MQTT authentication and will <strong>never be shown again</strong>.
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button onClick={resetModal}>I have saved my credentials</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
