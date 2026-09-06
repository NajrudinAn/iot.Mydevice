import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { platformClient } from '../api/client';
import { Activity, Database, Server, X, Copy, Check, ChevronLeft, FileJson, Clock, Filter, BarChart2, Layers } from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';

const buildTreeFromLiveData = (dataSubset) => {
    const root = { _isBranch: true, children: {} };
    Object.entries(dataSubset).forEach(([path, state]) => {
        const parts = path.split('.');
        let current = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current.children[part]) {
                current.children[part] = { _isBranch: true, children: {} };
            }
            current = current.children[part];
        }
        const lastPart = parts[parts.length - 1];
        current.children[lastPart] = { _isLeaf: true, state, path, name: lastPart };
    });
    return root;
};

const LiveMetricTreeRenderer = ({ node, level = 0, name = '', dataFields = [] }) => {
    if (node._isLeaf) {
        const fieldMeta = dataFields.find(f => f.field_name === node.path);
        const displayName = fieldMeta?.display_name || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        let displayValue = node.state.value;
        if (typeof displayValue === 'boolean') {
            displayValue = displayValue ? 'ON' : 'OFF';
        } else if (Array.isArray(displayValue)) {
            displayValue = JSON.stringify(displayValue);
        } else if (typeof displayValue === 'object' && displayValue !== null) {
            displayValue = JSON.stringify(displayValue);
        }
        
        return (
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden group flex flex-col h-full">
                <div className={`absolute top-0 left-0 w-1 h-full ${level > 1 ? 'bg-purple-400/40 group-hover:bg-purple-500' : 'bg-blue/30 group-hover:bg-blue'} transition-colors`}></div>
                <div className="text-xs font-medium text-slate-500 mb-0.5 truncate pl-1.5 pr-2" title={node.path}>{displayName}</div>
                <div className="text-lg font-bold text-main truncate mb-1 pl-1.5" title={String(displayValue)}>
                    {displayValue !== null ? String(displayValue) : 'Null'}
                    {fieldMeta?.unit && <span className="text-xs text-muted font-normal ml-1">{fieldMeta.unit}</span>}
                </div>
                <div className="mt-auto pt-1 pl-1.5">
                    {node.state.timestamp && (
                        <div className="text-[9px] font-medium text-slate-400">
                            Updated {new Date(node.state.timestamp).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (node._isBranch) {
        const childrenKeys = Object.keys(node.children);
        if (childrenKeys.length === 0) return null;
        
        const leaves = childrenKeys.filter(k => node.children[k]._isLeaf).map(k => node.children[k]);
        const branches = childrenKeys.filter(k => node.children[k]._isBranch).map(k => node.children[k]);
        
        const isRoot = level === 0;
        
        if (isRoot) {
            return (
                <div className="space-y-4">
                    {leaves.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {leaves.map(leaf => <LiveMetricTreeRenderer key={leaf.path} node={leaf} name={leaf.name} level={level + 1} dataFields={dataFields} />)}
                        </div>
                    )}
                    {branches.map(branch => {
                        const branchName = Object.keys(node.children).find(k => node.children[k] === branch);
                        return <LiveMetricTreeRenderer key={branchName} node={branch} name={branchName} level={level + 1} dataFields={dataFields} />;
                    })}
                </div>
            );
        }
        
        // Nested Group Container
        const childCount = leaves.length + branches.length;
        let gridClass = "grid-cols-1";
        if (leaves.length === 2) gridClass = "grid-cols-1 sm:grid-cols-2";
        else if (leaves.length === 3) gridClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        else if (leaves.length >= 4) gridClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
        
        const groupName = name.replace(/_/g, ' ').toUpperCase();
        
        return (
            <div className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50' : 'border-gray-200 bg-white'} rounded-lg p-3 sm:p-4 mb-3`}>
                <div className="flex-between align-center mb-3 border-b border-gray-100 pb-1.5">
                    <h4 className={`font-bold tracking-wide text-main ${level > 1 ? 'text-xs' : 'text-[11px] text-slate-500'}`}>
                        {groupName}
                    </h4>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {childCount} field{childCount !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="space-y-3">
                    {leaves.length > 0 && (
                        <div className={`grid gap-3 ${gridClass}`}>
                            {leaves.map(leaf => <LiveMetricTreeRenderer key={leaf.path} node={leaf} name={leaf.name} level={level + 1} dataFields={dataFields} />)}
                        </div>
                    )}
                    {branches.length > 0 && (
                        <div className="space-y-3 mt-3">
                            {branches.map(branch => {
                                const branchName = Object.keys(node.children).find(k => node.children[k] === branch);
                                return <LiveMetricTreeRenderer key={branchName} node={branch} name={branchName} level={level + 1} dataFields={dataFields} />;
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

export default function WorkspaceDataDeviceView() {
  const { workspaceId, deviceId, sourceId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [device, setDevice] = useState(null);
  const [dataFields, setDataFields] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live Data State
  const [liveData, setLiveData] = useState(null); 
  const latestTimestampRef = useRef(null);

  // History Data State
  const [historyRecords, setHistoryRecords] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h'); 
  const [selectedField, setSelectedField] = useState('All');

  // Modal State
  const [detailRecord, setDetailRecord] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDeviceAndFields();
  }, [workspaceId, deviceId]);

  // Reset states when sourceId changes
  useEffect(() => {
    setLiveData(null);
    latestTimestampRef.current = null;
    setHistoryRecords([]);
    setRecentRecords([]);
    setHistoryPage(1);
    setSelectedField('All');
    
    if (sourceId && !loading) {
      if (activeTab === 'live') fetchLiveState();
      else if (activeTab === 'history') fetchHistory(1);
    }
  }, [sourceId, activeTab, loading]);

  const fetchDeviceAndFields = async () => {
    try {
      setLoading(true);
      const devRes = await platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}`);
      setDevice(devRes.data.device);

      const fieldsRes = await platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/data-fields`);
      setDataFields(fieldsRes.data || []);
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load device details.');
    } finally {
      setLoading(false);
    }
  };

  const flattenJSON = (obj, prefix = '') => {
      return Object.keys(obj).reduce((acc, k) => {
          const pre = prefix.length ? prefix + '.' : '';
          if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
              Object.assign(acc, flattenJSON(obj[k], pre + k));
          } else {
              acc[pre + k] = obj[k];
          }
          return acc;
      }, {});
  };

  const getFilteredPayload = (payload, source) => {
      if (source === 'All' || !payload) return payload;
      
      if (payload[source] && typeof payload[source] === 'object' && !Array.isArray(payload[source])) {
          return payload[source];
      }
      
      const filtered = {};
      const relevantFields = dataFields.filter(f => f.source === source);
      if (relevantFields.length === 0) return payload;
      
      let foundAny = false;
      const flat = flattenJSON(payload);
      
      relevantFields.forEach(f => {
          if (flat[f.field_name] !== undefined) {
              const shortName = f.field_name.split('.').pop();
              filtered[shortName] = flat[f.field_name];
              foundAny = true;
          }
      });
      
      return foundAny ? filtered : payload;
  };

  const getCompactPreview = (payload, source) => {
      const subset = getFilteredPayload(payload, source);
      if (!subset || typeof subset !== 'object') return [];
      return Object.entries(subset).map(([k, v]) => ({ key: k, value: v }));
  };

  const fetchLiveState = async () => {
      try {
          const params = {};
          if (sourceId) params.source = sourceId;
          
          const [liveRes, recentRes] = await Promise.all([
              platformClient.get(`/workspaces/${workspaceId}/devices/${deviceId}/live-state`, { params }),
              platformClient.get(`/workspaces/${workspaceId}/data`, { params: { ...params, limit: 10 } })
          ]);

          setLiveData(liveRes.data); 
          setRecentRecords(recentRes.data.records || []);
          
          const timestamps = Object.values(liveRes.data).map(f => new Date(f.timestamp).getTime());
          if (timestamps.length > 0) {
              latestTimestampRef.current = new Date(Math.max(...timestamps)).toISOString();
          }
      } catch (err) {
          console.error("Failed to fetch live state", err);
      }
  };


  // Live SSE Status & Telemetry Updates
  // Only request telemetry if a specific source or 'All' is selected. 
  // If undefined (overview page), request 'None' so the server drops all telemetry and only sends status.
  const sseUrl = workspaceId && deviceId ? `/api/workspaces/${workspaceId}/devices/live-status?deviceId=${deviceId}&sourceId=${sourceId || 'None'}` : null;
  useSSE(sseUrl, token, (event, eventType) => {
      if (eventType === 'device-status') {
          if (!event || !event.deviceId) return;
          setDevice(prev => prev ? { ...prev, status: event.status, last_seen: event.lastSeen } : prev);
      } 
      else if (eventType === 'device-telemetry') {
          if (!event || !event.deviceId || !event.data) return;
          if (activeTab !== 'live') return;
          
          const newRecord = {
              device_id: event.deviceId,
              payload: event.data,
              recorded_at: event.timestamp
          };

          setRecentRecords(prev => {
              return [newRecord, ...prev].slice(0, 10);
          });

          setLiveData(prev => {
              const next = { ...(prev || {}) };
              if (event.data && typeof event.data === 'object') {
                  const flat = flattenJSON(event.data);
                  Object.entries(flat).forEach(([key, val]) => {
                      const fieldDef = dataFields.find(f => f.field_name === key);
                      if (sourceId === 'All' || (fieldDef && fieldDef.source === sourceId)) {
                          next[key] = {
                              value: val,
                              timestamp: event.timestamp
                          };
                      }
                  });
              }
              latestTimestampRef.current = event.timestamp;
              return next;
          });
      }
  });


  useEffect(() => {
      if (sourceId && activeTab === 'history' && device) {
          fetchHistory(1);
      }
  }, [activeTab, timeRange, selectedField, sourceId, device]);

  const getTimeRangeParams = () => {
      if (timeRange === 'all') return {};
      const end = new Date();
      const start = new Date();
      switch (timeRange) {
          case '15m': start.setMinutes(start.getMinutes() - 15); break;
          case '1h': start.setHours(start.getHours() - 1); break;
          case '6h': start.setHours(start.getHours() - 6); break;
          case '24h': start.setHours(start.getHours() - 24); break;
          case '7d': start.setDate(start.getDate() - 7); break;
          default: return {};
      }
      return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchHistory = async (page = historyPage) => {
      try {
          setHistoryLoading(true);
          const limit = 50;
          const offset = (page - 1) * limit;
          const timeParams = getTimeRangeParams();
          
          const params = {
              deviceId,
              limit,
              offset,
              ...timeParams
          };
          if (sourceId) params.source = sourceId;
          if (selectedField !== 'All') {
              params.fields = selectedField;
          }
          
          const res = await platformClient.get(`/workspaces/${workspaceId}/data`, { params });
          setHistoryRecords(res.data.records || []);
          setHistoryTotal(res.data.total || 0);
          setHistoryPage(page);
      } catch (err) {
          console.error("Failed to fetch history", err);
      } finally {
          setHistoryLoading(false);
      }
  };

  const handleCopyJSON = (jsonObj) => {
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openModal = (record) => {
      setDetailRecord(record);
      setModalViewMode(sourceId === 'All' ? 'full' : 'filtered');
  };

  if (loading) return <div className="flex-center p-12"><Spinner size={32} /></div>;
  if (error || !device) return (
      <div className="bg-white rounded-xl border border-gray-100 flex-column flex-center p-12 text-center max-w-2xl mx-auto mt-8 shadow-sm">
        <Activity size={40} className="text-red mb-4" />
        <h3 className="font-bold text-lg mb-2">{error || 'Device not found'}</h3>
        <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/data`)}>Go Back</Button>
      </div>
  );

  const isOnline = device.status?.toUpperCase() === 'ONLINE';
  
  const sourcesMap = {};
  dataFields.forEach(f => {
      const src = f.source || 'default';
      if (!sourcesMap[src]) sourcesMap[src] = [];
      sourcesMap[src].push(f);
  });
  const sourceKeys = Object.keys(sourcesMap).sort();

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="mb-6">
          <div className="flex items-center text-muted hover:text-main text-sm mb-4 transition-colors font-medium">
              <Link to={`/workspaces/${workspaceId}/data`} className="hover:underline flex-align">
                  <ChevronLeft size={16} className="mr-1" /> Data
              </Link>
              <span className="mx-2 text-slate-300">/</span>
              {sourceId ? (
                <>
                    <Link to={`/workspaces/${workspaceId}/data/${deviceId}`} className="hover:underline">{device.name}</Link>
                    <span className="mx-2 text-slate-300">/</span>
                    <span className="text-main capitalize">{sourceId === 'All' ? 'All Data' : sourceId}</span>
                </>
              ) : (
                <span className="text-main">{device.name}</span>
              )}
          </div>
          
          <div className="flex-between align-end">
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex-center ${isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Server size={24} />
                  </div>
                  <div>
                      <h1 className="text-2xl font-bold text-main">
                          {sourceId && sourceId !== 'All' ? sourceId.charAt(0).toUpperCase() + sourceId.slice(1) : device.name}
                      </h1>
                      <div className="flex-align gap-3 text-sm mt-1">
                          {sourceId && sourceId !== 'All' ? (
                              <span className="text-muted bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {dataFields.filter(f => f.source === sourceId).length} fields
                              </span>
                          ) : (
                              <span className="font-mono text-muted bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{device.device_id}</span>
                          )}
                          <span className="text-gray-300">•</span>
                          <div 
                              className={`flex items-center rounded border shrink-0 ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                              style={{ padding: '0.125rem 0.5rem', gap: '0.375rem', width: 'max-content' }}
                          >
                              <div 
                                  className={`rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                                  style={{ width: '0.375rem', height: '0.375rem' }}
                              ></div>
                              <span className="text-xs font-medium whitespace-nowrap leading-none" style={{ lineHeight: 1 }}>{isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {!sourceId ? (
        <div className="mt-8">
            <div className="flex-between align-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue/10 flex-center text-blue shadow-sm">
                        <Database size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-main tracking-tight">Data Sources</h2>
                        <p className="text-xs text-muted mt-0.5">Categorized telemetry streams</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/data/${deviceId}/source/All`)} className="flex-align gap-2 border-slate-300 hover:bg-slate-50 hover:text-blue hover:border-blue/30 transition-all">
                    <Layers size={16} className="text-blue" />
                    <span className="font-medium">View All Data</span>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sourceKeys.map(src => {
                    const fieldCount = sourcesMap[src].length;
                    
                    return (
                        <div 
                            key={src} 
                            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-blue/50 group flex flex-col relative overflow-hidden"
                            onClick={() => navigate(`/workspaces/${workspaceId}/data/${deviceId}/source/${src}`)}
                        >
                            {/* Accent Glow */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue/5 rounded-full blur-2xl group-hover:bg-blue/10 transition-colors"></div>
                            
                            <div className="flex-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors border-transparent">
                                        <Activity size={16} />
                                    </div>
                                    <h3 className="font-bold text-lg capitalize text-main group-hover:text-blue transition-colors">
                                        {src}
                                    </h3>
                                </div>
                                <div 
                                    className="bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors"
                                    style={{ padding: '0.25rem 0.625rem', lineHeight: 1 }}
                                >
                                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                                </div>
                            </div>
                            
                            <div className="flex-1 relative z-10">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-4">
                                    {sourcesMap[src].slice(0, 3).map(f => f.display_name || f.field_name.split('.').pop().replace(/_/g, ' ')).join(' • ')}
                                    {sourcesMap[src].length > 3 && <span className="opacity-50"> • ...</span>}
                                </p>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 flex-between align-center relative z-10">
                                <span className="text-xs font-medium text-slate-400 group-hover:text-blue/70 transition-colors">
                                    View telemetry
                                </span>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                    <ChevronLeft size={16} className="rotate-180" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {sourceKeys.length === 0 && (
                <div className="bg-white p-12 rounded-xl border border-gray-100 text-center shadow-sm mt-4">
                    <Activity size={32} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="font-medium text-main">No data sources discovered yet.</h3>
                    <p className="text-muted text-sm mt-1">Send telemetry to automatically register fields and sources.</p>
                </div>
            )}
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-slate-100/50 p-1 rounded-lg w-max mb-6 border border-slate-200">
              {['live', 'history', 'fields'].map(tab => (
                  <button
                      key={tab}
                      className={`px-5 py-2 text-sm font-medium rounded-md transition-all border ${
                          activeTab === tab 
                          ? 'bg-white text-blue shadow-sm border-blue' 
                          : 'text-muted hover:text-main hover:bg-slate-100 border-transparent'
                      }`}
                      onClick={() => setActiveTab(tab)}
                  >
                      {tab === 'live' ? 'Live Data' : tab === 'history' ? 'History' : 'Data Fields'}
                  </button>
              ))}
          </div>

          {activeTab === 'live' && (
              <div className="space-y-6">
                  {isOnline ? (
                      <div className="bg-green-50 text-green-800 p-4 rounded-xl flex-align gap-3 border border-green-200/50 shadow-sm">
                          <Activity size={20} className="text-green-500 animate-pulse" />
                          <div>
                              <p className="font-semibold">Device is currently online.</p>
                              <p className="text-sm opacity-90 mt-0.5">Receiving live telemetry data.</p>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex-align gap-3 border border-amber-200/50 shadow-sm">
                          <Clock size={20} className="text-amber-500" />
                          <div>
                              <p className="font-semibold">Device is currently offline.</p>
                              <p className="text-sm opacity-90 mt-0.5">Showing the latest known values.</p>
                          </div>
                      </div>
                  )}

                  <div className="flex-between align-center">
                      <h3 className="font-bold flex-align gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue animate-pulse"></span>
                          Live Metrics
                      </h3>
                  </div>

                  {!liveData || Object.keys(liveData).length === 0 ? (
                      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-muted shadow-sm">
                          No telemetry received for this source yet.
                      </div>
                  ) : (
                      <div className="bg-slate-50/30 rounded-2xl">
                          <LiveMetricTreeRenderer 
                              node={buildTreeFromLiveData(liveData)} 
                              dataFields={dataFields} 
                          />
                      </div>
                  )}

                  <div className="mt-8 mb-4">
                      <h3 className="font-bold flex-align gap-2">
                          <Clock size={16} className="text-muted" />
                          Recent Received Data
                      </h3>
                  </div>

                  {recentRecords.length === 0 ? (
                      <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-muted shadow-sm">
                          No recent messages.
                      </div>
                  ) : (
                      <div className="flex flex-col gap-0 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                          {recentRecords.map((record, index) => {
                              const subset = getFilteredPayload(record.payload, sourceId);
                              const fullJsonString = JSON.stringify(subset, null, 2);

                              return (
                                  <div key={record.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors ${index !== recentRecords.length -1 ? 'border-b border-gray-100' : ''}`}>
                                      <div className="shrink-0 w-24">
                                          <div className="font-medium text-main text-sm">
                                              {new Date(record.recorded_at).toLocaleTimeString()}
                                          </div>
                                          <div className="text-muted text-[10px] mt-0.5">
                                              {new Date(record.recorded_at).toLocaleDateString()}
                                          </div>
                                      </div>
                                      
                                      <div 
                                          className="flex-1 overflow-hidden whitespace-nowrap min-w-0 pr-4 text-xs font-mono text-slate-600 truncate border-l border-slate-100 pl-4"
                                          title={fullJsonString}
                                      >
                                          {JSON.stringify(subset)}
                                      </div>
                                      
                                      <div className="shrink-0">
                                          <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(record); }}>
                                              View JSON
                                          </Button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'history' && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
                  <div className="p-4 border-b border-gray-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-4">
                          <div className="relative">
                              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10" />
                              <select 
                                  className="form-input pl-9 text-sm font-medium pr-8 appearance-none bg-white min-w-[140px]"
                                  value={timeRange}
                                  onChange={(e) => setTimeRange(e.target.value)}
                              >
                                  <option value="15m">Last 15 minutes</option>
                                  <option value="1h">Last 1 hour</option>
                                  <option value="6h">Last 6 hours</option>
                                  <option value="24h">Last 24 hours</option>
                                  <option value="7d">Last 7 days</option>
                                  <option value="all">All time</option>
                              </select>
                          </div>
                          
                          <div className="relative">
                              <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10" />
                              <select 
                                  className="form-input pl-9 text-sm font-medium pr-8 appearance-none bg-white min-w-[160px]"
                                  value={selectedField}
                                  onChange={(e) => setSelectedField(e.target.value)}
                              >
                                  <option value="All">All Fields</option>
                                  {dataFields
                                      .filter(f => sourceId === 'All' || f.source === sourceId)
                                      .map(f => (
                                      <option key={f.field_name} value={f.field_name}>{f.display_name || f.field_name}</option>
                                  ))}
                              </select>
                          </div>
                      </div>
                      
                      <div className="text-sm text-muted font-medium">
                          {historyTotal} records found
                      </div>
                  </div>

                  <div className="flex-1 overflow-auto bg-slate-50/30">
                      {historyLoading ? (
                          <div className="flex-center h-64"><Spinner size={24} /></div>
                      ) : historyRecords.length === 0 ? (
                          <div className="flex-center flex-column text-muted h-64">
                              <Database size={32} className="opacity-30 mb-3" />
                              <p>No historical data for the selected range.</p>
                          </div>
                      ) : (
                          <div className="flex flex-col gap-0 border-t border-gray-100">
                              <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  <div className="w-24 shrink-0">Time</div>
                                  <div className="flex-1 border-l border-slate-100 pl-4">Payload Preview</div>
                                  <div className="w-24 shrink-0 text-right">Action</div>
                              </div>
                              
                              {historyRecords.map((record, index) => {
                                  const subset = getFilteredPayload(record.payload, sourceId);
                                  const fullJsonString = JSON.stringify(subset, null, 2);

                                  return (
                                      <div key={record.id} className={`flex items-center gap-4 px-4 py-3 bg-white hover:bg-slate-50 transition-colors ${index !== historyRecords.length -1 ? 'border-b border-gray-100' : ''}`}>
                                          <div className="shrink-0 w-24">
                                              <div className="font-medium text-main text-sm">{new Date(record.recorded_at).toLocaleTimeString()}</div>
                                              <div className="text-muted text-[10px] mt-0.5">{new Date(record.recorded_at).toLocaleDateString()}</div>
                                          </div>
                                          
                                          <div 
                                              className="flex-1 overflow-hidden whitespace-nowrap min-w-0 pr-4 text-xs font-mono text-slate-600 truncate border-l border-slate-100 pl-4"
                                              title={fullJsonString}
                                          >
                                              {JSON.stringify(subset)}
                                          </div>
                                          
                                          <div className="shrink-0 text-right w-24">
                                              <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(record); }}>
                                                  View JSON
                                              </Button>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
                  
                  {historyTotal > 0 && (
                      <div className="p-4 border-t border-gray-100 flex-between bg-white shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                          <span className="text-sm text-muted">
                              Showing {(historyPage - 1) * 50 + 1} to {Math.min(historyPage * 50, historyTotal)} of {historyTotal}
                          </span>
                          <div className="flex gap-2">
                              <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => fetchHistory(historyPage - 1)}>
                                  Previous
                              </Button>
                              <Button variant="outline" size="sm" disabled={historyPage * 50 >= historyTotal} onClick={() => fetchHistory(historyPage + 1)}>
                                  Next
                              </Button>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'fields' && (
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex-between bg-slate-50">
                      <div>
                          <h3 className="font-bold text-main">Discovered Data Fields</h3>
                          <p className="text-sm text-muted mt-1">Fields automatically detected for this source.</p>
                      </div>
                  </div>
                  
                  {dataFields.filter(f => sourceId === 'All' || f.source === sourceId).length === 0 ? (
                      <div className="p-12 text-center text-muted">
                          No fields discovered yet.
                      </div>
                  ) : (
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-muted font-semibold">
                                  <th className="p-4">Display Name</th>
                                  <th className="p-4">Raw Field Key</th>
                                  <th className="p-4">Type</th>
                                  <th className="p-4">Unit</th>
                                  <th className="p-4">Source</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {dataFields
                                  .filter(field => sourceId === 'All' || field.source === sourceId)
                                  .map(field => (
                                  <tr key={field.id} className="hover:bg-slate-50/50">
                                      <td className="p-4 font-medium text-main">{field.display_name || field.field_name}</td>
                                      <td className="p-4 font-mono text-xs text-muted">{field.field_name}</td>
                                      <td className="p-4 text-sm capitalize">{field.data_type}</td>
                                      <td className="p-4 text-sm text-muted">{field.unit || '—'}</td>
                                      <td className="p-4">
                                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                              {field.source}
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          )}

          {/* Payload Details Modal */}
          {detailRecord && (
              <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 99999 }}
              >
                  {/* Backdrop */}
                  <div 
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
                      onClick={(e) => { e.stopPropagation(); setDetailRecord(null); }}
                  ></div>
                  
                  {/* Modal Content */}
                  <div 
                      className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative z-10" 
                      style={{ width: '100%', maxWidth: '56rem', maxHeight: '90vh' }}
                  >
                      <div className="p-4 sm:px-6 sm:py-5 border-b border-gray-100 flex-between bg-white items-center shrink-0">
                          <div>
                              <h3 className="font-bold text-main flex-align gap-2 text-lg">
                                  <FileJson size={20} className="text-blue" />
                                  Received Payload
                              </h3>
                          </div>
                          <button onClick={() => setDetailRecord(null)} className="p-2 hover:bg-slate-100 rounded-lg text-muted transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                      
                      <div className="p-4 sm:p-6 bg-slate-50 flex-1 min-h-0 flex flex-col overflow-hidden">
                          <div className="mb-6 flex flex-col sm:flex-row gap-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm shrink-0">
                              <div className="flex-1">
                                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source</div>
                                  <div className="font-semibold text-main capitalize text-base">
                                      {sourceId !== 'All' ? sourceId : 'All Data'}
                                  </div>
                              </div>
                              <div className="w-px h-10 bg-gray-100 hidden sm:block"></div>
                              <div className="flex-1">
                                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Received</div>
                                  <div className="font-mono font-medium text-main text-base">
                                      {new Date(detailRecord.recorded_at).toLocaleTimeString()} 
                                      <span className="text-muted ml-2 text-sm font-sans font-normal">{new Date(detailRecord.recorded_at).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-[#0f172a] rounded-xl overflow-hidden shadow-lg border border-slate-700 flex flex-col flex-1 min-h-[300px]">
                              <div className="flex-between align-center px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0 flex-wrap gap-3">
                                  <span className="text-sm font-semibold text-slate-300 flex-align gap-2">
                                      {sourceId !== 'All' ? `Selected Source Data (${sourceId})` : 'Payload JSON'}
                                  </span>
                                  <div className="flex gap-2">
                                      <button 
                                          onClick={() => handleCopyJSON(sourceId === 'All' ? detailRecord.payload : getFilteredPayload(detailRecord.payload, sourceId))}
                                          className="text-xs font-medium px-3 py-1.5 rounded bg-blue hover:bg-blue-600 text-white transition-colors flex-align gap-1.5"
                                      >
                                          {copied ? <Check size={14} /> : <Copy size={14} />}
                                          {copied ? 'Copied!' : 'Copy JSON'}
                                      </button>
                                  </div>
                              </div>
                              <div className="p-4 overflow-x-auto overflow-y-auto flex-1 text-sm font-mono text-slate-300 custom-scrollbar">
                                  <pre className="m-0 leading-relaxed">
                                      {JSON.stringify(
                                          sourceId === 'All' 
                                              ? detailRecord.payload 
                                              : getFilteredPayload(detailRecord.payload, sourceId), 
                                          null, 
                                          2
                                      )}
                                  </pre>
                              </div>
                          </div>
                      </div>
                      
                      <div className="p-4 border-t border-gray-100 bg-white flex justify-end shrink-0">
                          <Button variant="outline" onClick={() => setDetailRecord(null)}>Close</Button>
                      </div>
                  </div>
              </div>
          )}
        </>
      )}
    </div>
  );
}
