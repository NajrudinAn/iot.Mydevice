import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { platformClient } from '../api/client';
import { Search, Server, Activity, Database, Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';

export default function WorkspaceData() {
  const { workspaceId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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
    fetchInitialData();
  }, [workspaceId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const devicesRes = await platformClient.get(`/workspaces/${workspaceId}/devices`);
      setDevices(devicesRes.data.devices || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load workspace devices.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.device_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex-center p-12"><Spinner size={32} /></div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 flex-column flex-center p-12 text-center max-w-2xl mx-auto mt-8 shadow-sm">
        <Activity size={40} className="text-red mb-4" />
        <h3 className="font-bold text-lg mb-2">{error}</h3>
        <Button variant="primary" onClick={fetchInitialData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex-between align-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-main mb-2">Device Data</h1>
          <p className="text-muted">View live telemetry, history, and discovered data fields from your devices.</p>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex-column flex-center p-16 text-center shadow-sm">
          <Database size={48} className="text-muted mb-4 opacity-30" />
          <h3 className="font-bold text-lg mb-2">No devices in this workspace yet.</h3>
          <p className="text-muted max-w-md mb-6">
            Register a device to start receiving and analyzing telemetry data.
          </p>
          <Button variant="primary" onClick={() => navigate(`/workspaces/${workspaceId}/devices`)}>
            <Plus size={16} className="mr-2" />
            Add Device
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Top Toolbar */}
          <div className="p-4 border-b border-gray-100 flex-between flex-wrap gap-4 bg-slate-50">
            <div className="relative w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10" />
              <input 
                type="text"
                placeholder="Search devices..."
                className="form-input pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Device List */}
          <div className="p-6 bg-slate-50 min-h-[400px]">
            {filteredDevices.length === 0 ? (
                <div className="flex-column flex-center text-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <Server size={32} className="text-slate-300 mb-3" />
                  <h4 className="font-semibold text-main mb-1">No devices found</h4>
                  <p className="text-sm text-muted">Try adjusting your search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDevices.map(device => {
                    const isOnline = device.status?.toUpperCase() === 'ONLINE';
                    const hasNeverConnected = !device.last_seen;
                    
                    return (
                        <Link 
                            key={device.device_id}
                            to={`/workspaces/${workspaceId}/data/${device.device_id}`}
                            className="group block transition-all relative overflow-hidden"
                            style={{ 
                              background: '#fff', borderRadius: '16px', padding: '20px',
                              boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)', border: '1px solid #e2e8f0',
                              cursor: 'pointer'
                            }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div style={{
                                  width: '40px', height: '40px', flexShrink: 0,
                                  borderRadius: '50%',
                                  border: isOnline ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                  background: isOnline ? '#ecfdf5' : '#f8fafc',
                                  color: isOnline ? '#059669' : '#64748b',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}>
                                    <Server size={18} />
                                </div>
                                <div style={{ 
                                  display: 'flex', alignItems: 'center', 
                                  background: isOnline ? '#ecfdf5' : '#f1f5f9', 
                                  color: isOnline ? '#059669' : '#64748b', 
                                  padding: '4px 12px', borderRadius: '9999px', 
                                  fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                                  letterSpacing: '0.05em', border: isOnline ? '1px solid #d1fae5' : '1px solid #e2e8f0'
                                }}>
                                    <div style={{ 
                                      width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', 
                                      background: isOnline ? '#10b981' : '#94a3b8' 
                                    }}></div>
                                    {isOnline ? 'Online' : 'Offline'}
                                </div>
                            </div>
                            
                            <h4 style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.01em' }} className="truncate group-hover:text-blue-600 transition-colors">
                              {device.name}
                            </h4>
                            <div style={{ marginBottom: '16px' }}>
                              <span style={{ 
                                background: '#f8fafc', color: '#475569', 
                                padding: '4px 12px', borderRadius: '9999px', 
                                fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
                                fontFamily: 'monospace', border: '1px solid #e2e8f0'
                              }}>
                                {device.device_id}
                              </span>
                            </div>
                            
                            <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                                    <Activity size={14} style={{ opacity: 0.7 }} />
                                    {hasNeverConnected ? 'Never connected' : new Date(device.last_seen).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }} className="group-hover:translate-x-1 transition-transform">
                                    View Data &rarr;
                                </div>
                            </div>
                        </Link>
                    );
                })}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
