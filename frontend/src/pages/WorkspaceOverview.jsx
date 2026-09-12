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
    <div style={{ position: 'relative', zIndex: 1 }}>
      <style>{`
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
        .stat-purple { background: linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 100%); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.2); }
        
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
      `}</style>
      
      <div className="flex-between mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.025em', color: 'var(--text-main)' }}>Workspace Overview</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>High-level metrics and recent activity across your workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="overview-stat-card">
          <div className="flex-between items-start mb-1 z-10">
            <div className="stat-icon-wrapper stat-blue">
              <Server size={20} />
            </div>
          </div>
          <h3 className="stat-title z-10">Total Devices</h3>
          <div className="stat-value z-10">{loading ? <Skeleton className="h-10 w-16 mt-1" /> : deviceCount}</div>
        </div>

        <div className="overview-stat-card">
          <div className="flex-between items-start mb-1 z-10">
            <div className="stat-icon-wrapper stat-green">
              <Wifi size={20} />
            </div>
          </div>
          <h3 className="stat-title z-10">Online Devices</h3>
          <div className="stat-value z-10">{loading ? <Skeleton className="h-10 w-16 mt-1" /> : onlineCount}</div>
        </div>

        <div className="overview-stat-card">
          <div className="flex-between items-start mb-1 z-10">
            <div className="stat-icon-wrapper stat-red">
              <WifiOff size={20} />
            </div>
          </div>
          <h3 className="stat-title z-10">Offline Devices</h3>
          <div className="stat-value z-10">{loading ? <Skeleton className="h-10 w-16 mt-1" /> : offlineCount}</div>
        </div>

        <div className="overview-stat-card">
          <div className="flex-between items-start mb-1 z-10">
            <div className="stat-icon-wrapper stat-purple">
              <LayoutGrid size={20} />
            </div>
          </div>
          <h3 className="stat-title z-10">Applications</h3>
          <div className="stat-value z-10">{loading ? <Skeleton className="h-10 w-16 mt-1" /> : applications.length}</div>
        </div>
      </div>

    </div>
  );
}
