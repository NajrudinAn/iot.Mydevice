import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { platformClient } from '../api/client';
import { Terminal, RefreshCcw, ChevronLeft, ChevronRight, Activity, Play, History, Search, Server, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import DeviceCommandPanel from '../components/commands/DeviceCommandPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSSE } from '../hooks/useSSE';

export default function WorkspaceCommands() {
    const { workspaceId, deviceId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('devices');
    
    // -- History Tab State --
    const [commands, setCommands] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    // -- Devices Tab State --
    const [devices, setDevices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [capabilities, setCapabilities] = useState([]);
    const [deviceStatus, setDeviceStatus] = useState('OFFLINE');

    const token = localStorage.getItem('platform_token');

    // Fetch workspace devices
    useEffect(() => {
        platformClient.get(`/workspaces/${workspaceId}/devices`)
            .then(res => {
                if (res.data.success) {
                    setDevices(res.data.devices);
                }
            })
            .catch(err => console.error("Failed to load devices", err));
    }, [workspaceId]);

    // Fetch selected device details if deviceId is present
    useEffect(() => {
        if (!deviceId) {
            setSelectedDevice(null);
            return;
        }
        
        const device = devices.find(d => d.id === deviceId || d.device_id === deviceId);
        if (device) {
            setSelectedDevice(device);
            setDeviceStatus(device.status || 'OFFLINE');
        } else if (devices.length > 0) {
            platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}`)
                .then(res => {
                    if (res.data.success) {
                        setSelectedDevice(res.data.device);
                        setDeviceStatus(res.data.device.status || 'OFFLINE');
                    }
                })
                .catch(err => console.error("Failed to load specific device", err));
        }

        const fetchId = device ? device.id : deviceId;

        platformClient.get(`/workspaces/${workspaceId}/devices/${fetchId}/capabilities`)
            .then(res => setCapabilities(res.data.capabilities || []))
            .catch(() => setCapabilities([]));

    }, [deviceId, workspaceId, devices]);

    // SSE for Live Updates
    useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event, eventType) => {
        if (eventType === 'device-status') {
            if (selectedDevice && event.deviceId === selectedDevice.device_id) {
                setDeviceStatus(event.status);
            }
            setDevices(prev => prev.map(d => d.device_id === event.deviceId ? { ...d, status: event.status, last_seen: event.lastSeen } : d));
        } else if (eventType === 'capability-update') {
             if (selectedDevice && event.deviceId === selectedDevice.device_id) {
                 platformClient.get(`/workspaces/${workspaceId}/devices/${selectedDevice.id}/capabilities`)
                    .then(res => setCapabilities(res.data.capabilities || []));
             }
        } else if (eventType === 'device-telemetry') {
             window.dispatchEvent(new CustomEvent('device-telemetry-update', { detail: event }));
        } else if (eventType === 'command-status') {
             window.dispatchEvent(new CustomEvent('device-command-update', { detail: event }));
        }
    });

    const fetchHistory = async (targetPage = 1) => {
        try {
            setHistoryLoading(true);
            const res = await platformClient.get(`/workspaces/${workspaceId}/commands?page=${targetPage}&limit=${limit}`);
            if (res.data.success) {
                setCommands(res.data.commands);
                setTotalPages(Math.ceil(res.data.total / limit));
                setPage(targetPage);
            }
        } catch (err) {
            setHistoryError(err.response?.data?.message || 'Failed to fetch commands');
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') fetchHistory(1);
    }, [activeTab, workspaceId]);

    // UI Helpers
    function getStatusBadge(status) {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
            case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
            case 'TIMEOUT': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
            case 'ACKNOWLEDGED': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'SENT': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'PENDING': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    const calculateDuration = (cmd) => {
        if (!cmd.created_at) return '-';
        const start = new Date(cmd.created_at);
        const end = cmd.completed_at ? new Date(cmd.completed_at) : cmd.failed_at ? new Date(cmd.failed_at) : null;
        if (!end) return '-';
        return `${(end - start)}ms`;
    };

    const filteredDevices = devices.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.device_id.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="w-full max-w-7xl mx-auto pb-12">
            {!deviceId && (
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Terminal size={24} className="text-blue-500" />
                        Commands
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Control your devices and execute their registered actions.</p>
                </div>
            )}

            {/* Tabs (Hide when inside a specific device command center) */}
            {!deviceId && (
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
                    <button onClick={() => setActiveTab('devices')} style={{ cursor: 'pointer' }} className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'devices' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <Play size={16} /> Devices
                    </button>
                    <button onClick={() => setActiveTab('history')} style={{ cursor: 'pointer' }} className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <History size={16} /> Command History
                    </button>
                </div>
            )}

            {/* Devices Tab -> Device List */}
            {!deviceId && activeTab === 'devices' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafaf9', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '320px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text"
                                placeholder="Search devices..."
                                style={{ 
                                  width: '100%', padding: '8px 16px 8px 36px', 
                                  borderRadius: '9999px', border: '1px solid #e2e8f0', 
                                  background: '#fff', fontSize: '13px', color: '#0f172a',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)', outline: 'none'
                                }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="p-6 bg-slate-50 dark:bg-gray-900 min-h-[400px]">
                        {filteredDevices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <Server size={32} className="text-gray-300 mb-3" />
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">No devices found</h4>
                                <p className="text-sm text-gray-500">Try adjusting your search criteria.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredDevices.map(device => {
                                    const isOnline = device.status?.toUpperCase() === 'ONLINE';
                                    const hasNeverConnected = !device.last_seen;
                                    
                                    return (
                                        <Link 
                                            key={device.device_id}
                                            to={`/workspaces/${workspaceId}/commands/${device.id}`}
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
                                                    Commands &rarr;
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

            {/* Selected Device Command Center */}
            {deviceId && (
                <div className="space-y-6">
                    <Link to={`/workspaces/${workspaceId}/commands`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={16} className="mr-2" /> Back to Devices
                    </Link>

                    {selectedDevice && (
                        <div style={{
                          background: '#fff', padding: '24px', borderRadius: '16px',
                          border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {selectedDevice.name}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                                  <span style={{ 
                                    background: '#f8fafc', color: '#475569', 
                                    padding: '4px 12px', borderRadius: '9999px', 
                                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em',
                                    fontFamily: 'monospace', border: '1px solid #e2e8f0'
                                  }}>
                                      {selectedDevice.device_id}
                                  </span>
                                  {selectedDevice.device_type && (
                                    <span style={{ 
                                      background: '#f1f5f9', color: '#64748b', 
                                      padding: '4px 12px', borderRadius: '9999px', 
                                      fontSize: '11px', fontWeight: 600, border: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        {selectedDevice.device_type}
                                    </span>
                                  )}
                                  <div style={{ 
                                    display: 'flex', alignItems: 'center', 
                                    background: deviceStatus === 'ONLINE' ? '#ecfdf5' : '#f1f5f9', 
                                    color: deviceStatus === 'ONLINE' ? '#059669' : '#64748b', 
                                    padding: '4px 12px', borderRadius: '9999px', 
                                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                                    letterSpacing: '0.05em', border: deviceStatus === 'ONLINE' ? '1px solid #d1fae5' : '1px solid #e2e8f0'
                                  }}>
                                      <div style={{ 
                                        width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', 
                                        background: deviceStatus === 'ONLINE' ? '#10b981' : '#94a3b8' 
                                      }}></div>
                                      {deviceStatus === 'ONLINE' ? 'Online' : 'Offline'}
                                  </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>
                                    Last activity: {selectedDevice.last_seen ? new Date(selectedDevice.last_seen).toLocaleString() : 'Never'}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    <ErrorBoundary>
                        <DeviceCommandPanel 
                            workspaceId={workspaceId}
                            deviceId={selectedDevice?.id || deviceId}
                            hardwareId={selectedDevice?.device_id}
                            capabilities={capabilities}
                            deviceStatus={deviceStatus}
                        />
                    </ErrorBoundary>
                </div>
            )}

            {/* History Tab */}
            {!deviceId && activeTab === 'history' && (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafaf9' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', margin: 0 }}>Workspace Command History</h3>
                        <div style={{ width: '100px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" icon={RefreshCcw} onClick={() => fetchHistory(1)} loading={historyLoading} style={{ height: '38px', minWidth: '105px', boxSizing: 'border-box' }}>Refresh</Button>
                        </div>
                    </div>
                    {historyError ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#ef4444' }}>{historyError}</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Device</th>
                                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Command</th>
                                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Requested By</th>
                                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLoading && commands.length === 0 ? (
                                        <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
                                    ) : commands.length === 0 ? (
                                        <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No commands have been sent in this workspace.</td></tr>
                                    ) : (
                                        commands.map((cmd, index) => {
                                            let statusColor = { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' };
                                            if (cmd.status === 'COMPLETED') statusColor = { bg: '#ecfdf5', text: '#059669', border: '#d1fae5', dot: '#10b981' };
                                            else if (cmd.status === 'FAILED' || cmd.status === 'TIMEOUT' || cmd.status === 'REJECTED') statusColor = { bg: '#fef2f2', text: '#dc2626', border: '#fee2e2', dot: '#ef4444' };
                                            else if (cmd.status === 'ACKNOWLEDGED' || cmd.status === 'SENT') statusColor = { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe', dot: '#3b82f6' };

                                            return (
                                                <tr key={cmd.id} style={{ borderBottom: index === commands.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                    <td style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>{new Date(cmd.created_at).toLocaleString()}</td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <Link to={`/workspaces/${workspaceId}/commands/${cmd.device_id}`} style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
                                                            {cmd.public_device_id || cmd.device_id}
                                                        </Link>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{cmd.command_type}</td>
                                                    <td style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>{cmd.requested_by_email}</td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ 
                                                          display: 'inline-flex', alignItems: 'center', 
                                                          background: statusColor.bg, color: statusColor.text, 
                                                          padding: '4px 12px', borderRadius: '9999px', 
                                                          fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                                                          letterSpacing: '0.05em', border: `1px solid ${statusColor.border}`
                                                        }}>
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', background: statusColor.dot }}></div>
                                                            {cmd.status}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{calculateDuration(cmd)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fafaf9' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Page {page} of {totalPages}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="outline" size="sm" icon={ChevronLeft} onClick={() => fetchHistory(page - 1)} disabled={page === 1 || historyLoading}>Previous</Button>
                                <Button variant="outline" size="sm" className="flex-row-reverse" icon={ChevronRight} onClick={() => fetchHistory(page + 1)} disabled={page === totalPages || historyLoading}>Next</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
