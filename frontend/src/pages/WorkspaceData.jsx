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
                            className="group block bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue/40 transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-blue transition-colors"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-lg flex-center ${isOnline ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Server size={20} />
                                </div>
                                <div 
                                    className={`flex items-center rounded border shrink-0 ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                    style={{ padding: '0.25rem 0.625rem', gap: '0.375rem', width: 'max-content' }}
                                >
                                    <div 
                                        className={`rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                                        style={{ width: '0.375rem', height: '0.375rem' }}
                                    ></div>
                                    <span className="text-xs font-medium whitespace-nowrap leading-none" style={{ lineHeight: 1 }}>{isOnline ? 'Online' : 'Offline'}</span>
                                </div>
                            </div>
                            
                            <h4 className="font-bold text-lg text-main mb-1 truncate group-hover:text-blue transition-colors">{device.name}</h4>
                            <div className="font-mono text-xs text-muted mb-4 bg-slate-50 px-2 py-1 rounded w-max border border-slate-100">{device.device_id}</div>
                            
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-xs text-muted flex items-center gap-1.5">
                                    <Activity size={14} />
                                    {hasNeverConnected ? 'Never connected' : new Date(device.last_seen).toLocaleDateString()}
                                </div>
                                <div className="text-sm font-medium text-blue opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transform flex items-center">
                                    View Data <span className="ml-1">→</span>
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
