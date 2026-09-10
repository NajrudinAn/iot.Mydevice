import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Activity, LayoutGrid, Server, Hexagon, ArrowRight, Battery, Wifi, WifiOff, Clock
} from 'lucide-react';
import { platformClient, getPlatformApplications } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { useSSE } from '../hooks/useSSE';

export default function WorkspaceOverview() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [workspace, setWorkspace] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live SSE Status Updates for online/offline counts
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event, eventType) => {
    if (eventType !== 'device-status') return;
    if (!event || !event.deviceId || !event.status) return;
    
    setWorkspace(prev => {
      if (!prev) return prev;
      
      let updatedRecent = prev.recent_devices || [];
      let newOnlineCount = prev.online_devices || 0;
      let newOfflineCount = prev.offline_devices || 0;
      
      const existing = updatedRecent.find(d => d.device_id === event.deviceId);
      const oldStatus = existing ? existing.status?.toUpperCase() : null;
      const newStatus = event.status?.toUpperCase();
      
      if (oldStatus !== newStatus) {
         if (newStatus === 'ONLINE') {
            newOnlineCount = newOnlineCount + 1;
            newOfflineCount = Math.max(0, newOfflineCount - 1);
         } else if (newStatus === 'OFFLINE' && oldStatus === 'ONLINE') {
            newOfflineCount = newOfflineCount + 1;
            newOnlineCount = Math.max(0, newOnlineCount - 1);
         }
      }

      updatedRecent = updatedRecent.map(d => 
        d.device_id === event.deviceId 
          ? { ...d, status: event.status, last_seen: event.lastSeen } 
          : d
      );
      
      return { 
        ...prev, 
        recent_devices: updatedRecent,
        online_devices: newOnlineCount,
        offline_devices: newOfflineCount
      };
    });
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [wsRes, appsRes] = await Promise.all([
          platformClient.get(`/workspaces/${workspaceId}`).catch(() => null),
          getPlatformApplications().catch(() => ({ applications: [] }))
        ]);
        
        if (!wsRes || !wsRes.data.workspace) {
           setError("You don't have access to this workspace.");
           setLoading(false);
           return;
        }
        
        setWorkspace(wsRes.data.workspace);
        
        const workspaceApps = appsRes.applications?.filter(a => a.workspace_id === workspaceId) || [];
        setApplications(workspaceApps);
      } catch (err) {
        console.error("Failed to load workspace data", err);
        setError('Unable to load workspace');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId]);

  if (error) {
    return (
      <div className="flex-align flex-center" style={{ height: '50vh' }}>
        <div className="text-center text-red">
          <Activity size={32} className="mx-auto mb-3 opacity-50" />
          <h2 className="text-lg font-bold">{error}</h2>
        </div>
      </div>
    );
  }

  const deviceCount = workspace?.device_count || 0;
  const onlineCount = workspace?.online_devices || 0;
  const offlineCount = workspace?.offline_devices || 0;

  return (
    <div>
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.025em', color: 'var(--text-main)' }}>Workspace Overview</h1>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>High-level metrics and recent activity across your workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="ds-card p-6 flex-col justify-center relative overflow-hidden">
          <div className="flex-between mb-2 z-10">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Total Devices</h3>
            <Server size={18} className="text-blue" />
          </div>
          <div className="text-3xl font-black text-main z-10">{loading ? <Skeleton className="h-8 w-16 mt-1" /> : deviceCount}</div>
        </div>

        <div className="ds-card p-6 flex-col justify-center relative overflow-hidden">
          <div className="flex-between mb-2 z-10">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Online Devices</h3>
            <Wifi size={18} className="text-green" />
          </div>
          <div className="text-3xl font-black text-main z-10">{loading ? <Skeleton className="h-8 w-16 mt-1" /> : onlineCount}</div>
        </div>

        <div className="ds-card p-6 flex-col justify-center relative overflow-hidden">
          <div className="flex-between mb-2 z-10">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Offline Devices</h3>
            <WifiOff size={18} className="text-red" />
          </div>
          <div className="text-3xl font-black text-main z-10">{loading ? <Skeleton className="h-8 w-16 mt-1" /> : offlineCount}</div>
        </div>

        <div className="ds-card p-6 flex-col justify-center relative overflow-hidden">
          <div className="flex-between mb-2 z-10">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Applications</h3>
            <LayoutGrid size={18} className="text-purple" />
          </div>
          <div className="text-3xl font-black text-main z-10">{loading ? <Skeleton className="h-8 w-16 mt-1" /> : applications.length}</div>
        </div>
      </div>

    </div>
  );
}
