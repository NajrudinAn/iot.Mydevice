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
                    <button onClick={() => setActiveTab('devices')} className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'devices' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <Play size={16} /> Devices
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <History size={16} /> Command History
                    </button>
                </div>
            )}

            {/* Devices Tab -> Device List */}
            {!deviceId && activeTab === 'devices' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-between flex-wrap gap-4 bg-slate-50 dark:bg-gray-900/50">
                        <div className="relative w-full md:w-72">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                            <input 
                                type="text"
                                placeholder="Search devices..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                                            className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-blue-500 transition-colors"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOnline ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    <Server size={20} />
                                                </div>
                                                <div 
                                                    className={`flex items-center rounded border shrink-0 ${isOnline ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                                    style={{ padding: '0.25rem 0.625rem', gap: '0.375rem', width: 'max-content' }}
                                                >
                                                    <div 
                                                        className={`rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                                                        style={{ width: '0.375rem', height: '0.375rem' }}
                                                    ></div>
                                                    <span className="text-xs font-medium whitespace-nowrap leading-none" style={{ lineHeight: 1 }}>{isOnline ? 'Online' : 'Offline'}</span>
                                                </div>
                                            </div>
                                            
                                            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 truncate group-hover:text-blue-500 transition-colors">{device.name}</h4>
                                            <div className="font-mono text-xs text-gray-500 mb-4 bg-slate-50 dark:bg-gray-900 px-2 py-1 rounded w-max border border-slate-100 dark:border-gray-700">{device.device_id}</div>
                                            
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                    <Activity size={14} />
                                                    {hasNeverConnected ? 'Never connected' : new Date(device.last_seen).toLocaleDateString()}
                                                </div>
                                                <div className="text-sm font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transform flex items-center">
                                                    Commands <span className="ml-1">→</span>
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
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    {selectedDevice.name}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-mono">{selectedDevice.device_id}</p>
                                <p className="text-sm text-gray-500 mt-1">{selectedDevice.device_type || 'Device'}</p>
                            </div>
                            <div className="flex flex-col md:items-end">
                                <div className={`flex items-center rounded-full border px-3 py-1 gap-2 mb-2 w-max ${deviceStatus === 'ONLINE' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${deviceStatus === 'ONLINE' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                    <span className="text-sm font-semibold">{deviceStatus === 'ONLINE' ? 'Online' : 'Offline'}</span>
                                </div>
                                <span className="text-xs text-gray-500">
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
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Workspace Command History</h3>
                        <Button variant="secondary" icon={RefreshCcw} onClick={() => fetchHistory(1)} loading={historyLoading}>Refresh</Button>
                    </div>
                    {historyError ? (
                        <div className="p-12 text-center text-red-500">{historyError}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Time</th>
                                        <th className="px-6 py-4 font-medium">Device</th>
                                        <th className="px-6 py-4 font-medium">Command</th>
                                        <th className="px-6 py-4 font-medium">Requested By</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {historyLoading && commands.length === 0 ? (
                                        <tr><td colSpan="6" className="px-6 py-12 text-center">Loading...</td></tr>
                                    ) : commands.length === 0 ? (
                                        <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No commands have been sent in this workspace.</td></tr>
                                    ) : (
                                        commands.map((cmd) => (
                                            <tr key={cmd.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 whitespace-nowrap">{new Date(cmd.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-4 font-mono text-xs">
                                                    <Link to={`/workspaces/${workspaceId}/commands/${cmd.device_id}`} className="text-blue-600 hover:underline">{cmd.public_device_id || cmd.device_id}</Link>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cmd.command_type}</td>
                                                <td className="px-6 py-4 text-xs">{cmd.requested_by_email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusBadge(cmd.status)}`}>{cmd.status}</span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{calculateDuration(cmd)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
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
