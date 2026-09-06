import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../../api/client';
import { 
  Users, Server, Webhook, LayoutDashboard, Plus, 
  Activity, ArrowRight, RefreshCw, Box, CheckCircle2, Circle
} from 'lucide-react';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import Button from '../ui/Button';

export default function AdminOverview() {
  const { applicationId, applicationSlug } = useParams();
  const navigate = useNavigate();
  
  const [appDetails, setAppDetails] = useState(null);
  const [data, setData] = useState({ users: [], devices: [], apis: [], dashboards: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [appRes, usersRes, devicesRes, apisRes, dashRes] = await Promise.all([
        appClient.get(`/applications/${applicationId}`).catch(() => ({ data: { application: null } })),
        appClient.get(`/applications/${applicationId}/users`).catch(() => ({ data: { users: [] } })),
        appClient.get(`/applications/${applicationId}/devices`).catch(() => ({ data: { devices: [] } })),
        appClient.get(`/applications/${applicationId}/apis`).catch(() => ({ data: { apis: [] } })),
        appClient.get(`/applications/${applicationId}/dashboards`).catch(() => ({ data: { dashboards: [] } }))
      ]);
      
      setAppDetails(appRes.data?.application || null);
      setData({
        users: usersRes.data?.users || [],
        devices: devicesRes.data?.devices || [],
        apis: apisRes.data?.apis || [],
        dashboards: dashRes.data?.dashboards || []
      });
    } catch (err) {
      console.error("Failed to load overview data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onlineDevices = data.devices.filter(d => d.status === 'online' || d.is_online).length;
  const offlineDevices = data.devices.length - onlineDevices;
  // Checking if there's any recent device activity
  const mostRecentDevice = [...data.devices].sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))[0];
  const lastReceived = mostRecentDevice?.last_seen || null;

  // Empty state check
  const isBrandNew = data.devices.length === 0 && data.dashboards.length === 0 && data.apis.length === 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'Status unavailable';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Status unavailable';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      {/* Application Header */}
      <div className="flex-between flex-wrap gap-4 mb-8">
        <div className="flex-align gap-4">
          <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '48px', height: '48px' }}>
            <Box size={24} />
          </div>
          <div>
            <div className="flex-align gap-3 mb-1">
              <h1 className="text-2xl font-bold text-main tracking-tight">
                {loading ? <Skeleton width="180px" height="28px" /> : (appDetails?.name || 'Application')}
              </h1>
              {!loading && (
                <span className="badge badge-success uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500"></span>
                  Active
                </span>
              )}
            </div>
            <div className="text-sm text-muted">
              {loading ? <Skeleton width="220px" height="16px" /> : (
                <>Workspace: <span className="font-medium text-main">{appDetails?.workspace_name || 'Current Workspace'}</span></>
              )}
            </div>
          </div>
        </div>
        <div className="flex-align gap-3">
          <Button 
            variant="secondary"
            icon={RefreshCw}
            onClick={() => fetchData(true)}
            loading={refreshing}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button 
            variant="secondary" 
            icon={LayoutDashboard}
            onClick={() => navigate(`${basePath}/dashboards`)}
          >
            Dashboard
          </Button>
          <Button 
            variant="primary" 
            icon={Plus}
            onClick={() => navigate(`${basePath}/admin/devices`)}
          >
            Add Device
          </Button>
        </div>
      </div>

      {loading && !refreshing ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Summary Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card flex-align gap-4 hover:-translate-y-1 transition-all duration-200">
              <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '48px', height: '48px' }}>
                <Server size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-1">Total Devices</div>
                <div className="text-2xl font-bold leading-none">{data.devices.length}</div>
              </div>
            </div>
            
            <div className="glass-card flex-align gap-4 hover:-translate-y-1 transition-all duration-200">
              <div className="ds-icon-box bg-green-light text-green" style={{ width: '48px', height: '48px' }}>
                <Activity size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-1">Online</div>
                <div className="text-2xl font-bold leading-none text-green">{onlineDevices}</div>
              </div>
            </div>
            
            <div className="glass-card flex-align gap-4 hover:-translate-y-1 transition-all duration-200">
              <div className="ds-icon-box bg-gray-100 text-muted" style={{ width: '48px', height: '48px' }}>
                <Server size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-1">Offline</div>
                <div className="text-2xl font-bold leading-none text-red">{offlineDevices}</div>
              </div>
            </div>
            
            <div className="glass-card flex-align gap-4 hover:-translate-y-1 transition-all duration-200">
              <div className="ds-icon-box bg-purple-light text-purple" style={{ width: '48px', height: '48px' }}>
                <Webhook size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-1">APIs</div>
                <div className="text-2xl font-bold leading-none">{data.apis.length}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Device Status & Data Receiving */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Device Status */}
              <div className="glass-card p-0 flex-column h-full">
                <div className="p-5 border-b border-gray-100 flex-align gap-2">
                  <Server size={18} className="text-muted" />
                  <h3 className="font-bold text-main text-lg">Device Status</h3>
                </div>
                
                <div className="p-5">
                  <div className="flex-align gap-8 mb-6">
                    <div>
                      <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-1">Total Devices</div>
                      <div className="font-bold text-xl text-main">{data.devices.length}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-1">Currently Online</div>
                      <div className="font-bold text-xl text-green">{onlineDevices}</div>
                    </div>
                  </div>
                  
                  {data.devices.length > 0 ? (
                    <div className="space-y-3">
                      {data.devices.slice(0, 3).map(dev => (
                        <div key={dev.id} className="flex-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="font-medium text-sm text-main">{dev.name || 'Unnamed Device'}</div>
                          <span className={`badge ${(dev.status === 'online' || dev.is_online) ? 'badge-success' : 'badge-neutral'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${(dev.status === 'online' || dev.is_online) ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                            {(dev.status === 'online' || dev.is_online) ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      ))}
                      {data.devices.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full mt-2 text-blue hover:bg-blue-light justify-center"
                          onClick={() => navigate(`${basePath}/admin/devices`)}
                        >
                          View all {data.devices.length} devices <ArrowRight size={16} />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted bg-gray-50 p-6 rounded-lg text-center border border-dashed border-gray-200">
                      No devices connected yet.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Latest Device Activity */}
              <div className="glass-card p-0 flex-column h-full">
                <div className="p-5 border-b border-gray-100 flex-align gap-2">
                  <Activity size={18} className="text-muted" />
                  <h3 className="font-bold text-main text-lg">Latest Device Activity</h3>
                </div>
                
                <div className="p-5">
                  <div className="mb-6">
                    <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-3">Device Activity Feed</div>
                    <div className="flex-align gap-3">
                      <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '32px', height: '32px' }}>
                        <Activity size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-main text-sm">Monitoring Devices</div>
                        <div className="text-xs text-muted">Tracking device heartbeats</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-px bg-gray-100 my-4 w-full"></div>
                  
                  <div>
                    <div className="text-xs font-semibold text-muted tracking-wide uppercase mb-2">Last Device Seen</div>
                    <div className="text-sm font-medium text-main bg-gray-50 p-3 rounded-lg border border-gray-100 inline-block">
                      {lastReceived ? formatDate(lastReceived) : 'No recent activity'}
                    </div>
                    {!lastReceived && (
                      <p className="text-xs text-muted mt-3">
                        Connect a device to see activity timestamps here.
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Actions & Get Started */}
            <div className="space-y-6 flex-column">
              
              {isBrandNew && (
                <div className="glass-card bg-blue-50 border-blue-200 p-5">
                  <h3 className="font-bold text-blue-800 mb-4">Get Started</h3>
                  <div className="flex-column gap-3 text-sm text-blue-700">
                    <div className="flex-align gap-2 font-medium">
                      <CheckCircle2 size={16} className="text-blue-500" /> Application created
                    </div>
                    <div className="flex-align gap-2 opacity-80 cursor-pointer hover:opacity-100 hover:text-blue-600 transition-colors" onClick={() => navigate(`${basePath}/admin/devices`)}>
                      <Circle size={16} /> Add your first device
                    </div>
                    <div className="flex-align gap-2 opacity-80">
                      <Circle size={16} /> Receive device data
                    </div>
                    <div className="flex-align gap-2 opacity-80 cursor-pointer hover:opacity-100 hover:text-blue-600 transition-colors" onClick={() => navigate(`${basePath}/dashboards`)}>
                      <Circle size={16} /> Create a dashboard
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-card p-0 flex-1">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-main text-lg">Quick Actions</h3>
                </div>
                <div className="p-5 flex-column gap-3">
                  <Button 
                    variant="primary" 
                    icon={Plus} 
                    className="w-full justify-center"
                    onClick={() => navigate(`${basePath}/admin/devices`)}
                  >
                    Add Device
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-center"
                    onClick={() => navigate(`${basePath}/admin/devices`)}
                  >
                    View Devices
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-center"
                    onClick={() => navigate(`${basePath}/dashboards`)}
                  >
                    Create Dashboard
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full justify-center"
                    onClick={() => navigate(`${basePath}/admin/security`)}
                  >
                    Create API
                  </Button>
                </div>
              </div>
              
            </div>
          </div>
        </>
      )}
    </div>
  );
}
