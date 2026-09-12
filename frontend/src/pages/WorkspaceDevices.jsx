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
        
        .overview-stat-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        @media (max-width: 768px) {
          .overview-stat-card {
            padding: 1rem;
          }
        }
        .overview-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -5px rgba(15, 23, 42, 0.06);
        }
        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }
        .stat-blue { background: linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%); color: #2563eb; border: 1px solid rgba(59,130,246,0.2); }
        .stat-green { background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
        .stat-red { background: linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
        
        .stat-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }
        
        .premium-table-row {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .premium-table-row:hover {
          background-color: #f8fafc;
        }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="overview-stat-card">
              <div className="flex-between items-start mb-1 z-10">
                <div className="stat-icon-wrapper stat-blue">
                  <Server size={20} />
                </div>
              </div>
              <h3 className="stat-title z-10">Total Devices</h3>
              <div className="stat-value z-10">{loading ? '-' : stats.total}</div>
            </div>

            <div className="overview-stat-card">
              <div className="flex-between items-start mb-1 z-10">
                <div className="stat-icon-wrapper stat-green">
                  <Activity size={20} />
                </div>
              </div>
              <h3 className="stat-title z-10">Online Devices</h3>
              <div className="stat-value z-10">{loading ? '-' : stats.online}</div>
            </div>

            <div className="overview-stat-card">
              <div className="flex-between items-start mb-1 z-10">
                <div className="stat-icon-wrapper stat-red">
                  <Server size={20} />
                </div>
              </div>
              <h3 className="stat-title z-10">Offline Devices</h3>
              <div className="stat-value z-10">{loading ? '-' : stats.offline}</div>
            </div>
          </div>

          {/* Toolbar */}
          {/* Toolbar */}
          {/* Toolbar */}
          <div className="flex flex-row items-center gap-3 mb-6">
            <div className="relative w-full max-w-[320px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search devices..."
                className="form-input pl-9 w-full bg-white border-gray-200 text-sm shadow-sm focus:border-blue-500 transition-colors rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative shrink-0 w-[140px]">
              <select 
                className="form-select appearance-none pl-3 pr-8 w-full text-sm bg-white border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors rounded-lg" 
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
                        <tr key={device.id} className="premium-table-row" onClick={() => navigate(`/workspaces/${workspaceId}/devices/${device.id}`)}>
                          <td>
                            <div className="font-bold text-main" style={{ fontSize: '15px' }}>{device.name}</div>
                          </td>
                          <td>
                            <span className="font-mono text-[13px] text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-md font-medium tracking-wide shadow-sm">
                              {device.device_id}
                            </span>
                          </td>
                          <td className="text-muted font-medium">{device.device_type || 'Unknown'}</td>
                          <td>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="text-muted text-sm font-medium">
                            {formatLastSeen(device.last_seen)}
                          </td>
                          <td className="text-right">
                             <div className="text-muted flex justify-end">
                                <ChevronRight size={18} />
                             </div>
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
                    <div key={device.id} className="glass-card p-5 flex-col gap-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/workspaces/${workspaceId}/devices/${device.id}`)}>
                       <div className="flex-between items-start mb-1">
                          <div>
                            <div className="font-bold text-main text-lg mb-1">{device.name}</div>
                            <span className="font-mono text-[13px] text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-md font-medium tracking-wide shadow-sm">{device.device_id}</span>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${device.status?.toUpperCase() === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {device.status?.toUpperCase() === 'ONLINE' ? 'Online' : 'Offline'}
                          </span>
                       </div>
                       
                       <div className="text-sm text-muted flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                          <div className="flex-between font-medium"><span>Type</span> <span className="text-main">{device.device_type}</span></div>
                          <div className="flex-between font-medium"><span>Last Seen</span> <span className="text-main">{formatLastSeen(device.last_seen)}</span></div>
                       </div>
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
