import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlatformApplications, platformClient } from '../api/client';
import { 
  AppWindow, Plus, LayoutGrid, Box, Users, Server, Activity, Copy, CheckCircle, 
  ChevronRight, Key, Shield, Droplets, Leaf, MoreVertical, AlertTriangle, Smartphone,
  Settings, Terminal, History, Code, Wifi, WifiOff, X, ArrowRight, Trash2
} from 'lucide-react';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';
import CreateApplicationFlow from '../components/applications/CreateApplicationFlow';
import Modal from '../components/ui/Modal';

import Button from '../components/ui/Button';

// Decorative background element
const BackgroundPattern = () => (
  <div className="absolute top-0 right-0 w-full h-64 overflow-hidden pointer-events-none -z-10 opacity-40">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circles" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--blue)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2"/>
          <circle cx="50" cy="50" r="20" fill="none" stroke="var(--blue)" strokeWidth="0.5" opacity="0.1"/>
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0"/>
          <stop offset="100%" stopColor="white" stopOpacity="1"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#circles)" />
      <rect width="100%" height="100%" fill="url(#fade)" />
      
      {/* Decorative large circles floating on the right */}
      <circle cx="85%" cy="20%" r="150" fill="none" stroke="var(--blue)" strokeWidth="1" opacity="0.05" />
      <circle cx="85%" cy="20%" r="200" fill="none" stroke="var(--blue)" strokeWidth="1" opacity="0.03" />
      <circle cx="85%" cy="20%" r="250" fill="none" stroke="var(--blue)" strokeWidth="1" opacity="0.02" strokeDasharray="5 10" />
      
      {/* Small floating dots */}
      <circle cx="70%" cy="10%" r="4" fill="var(--blue)" opacity="0.1" />
      <circle cx="95%" cy="40%" r="6" fill="var(--blue)" fillOpacity="0" stroke="var(--blue)" strokeWidth="1" opacity="0.2" />
    </svg>
  </div>
);



export default function ApplicationsList() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [workspace, setWorkspace] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [confirmDeleteAppId, setConfirmDeleteAppId] = useState(null);

  // Live SSE Status Updates
  useSSE(workspaceId ? `/api/workspaces/${workspaceId}/devices/live-status` : null, token, (event, eventType) => {
    if (eventType !== 'device-status') return;
    if (!event || !event.deviceId || !event.status) return;
    
    // Update Counts Intelligently
    setWorkspace(prev => {
      if (!prev) return prev;
      
      let updatedRecent = prev.recent_devices || [];
      let newOnlineCount = prev.online_devices || 0;
      let newOfflineCount = prev.offline_devices || 0;
      
      // Check if we already have this device in recent_devices
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

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/workspaces/${workspaceId}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newAppName, description: newAppDesc })
      });
      if (!response.ok) {
         throw new Error('Failed to create application');
      }
      setShowCreateModal(false);
      setNewAppName('');
      setNewAppDesc('');
      
      const appsRes = await getPlatformApplications().catch(() => ({ applications: [] }));
      const workspaceApps = appsRes.applications?.filter(a => a.workspace_id === workspaceId) || [];
      setApplications(workspaceApps);
      
      // Refresh workspace stats to update application count
      platformClient.get(`/workspaces/${workspaceId}`).then(wsRes => {
          if (wsRes.data.workspace) setWorkspace(wsRes.data.workspace);
      }).catch(err => console.log('Could not refresh workspace stats', err));

    } catch (err) {
      console.error(err);
      alert('Unable to create application');
    } finally {
      setCreating(false);
    }
  };

  const requestDeleteApplication = (e, appId) => {
    e.stopPropagation();
    setConfirmDeleteAppId(appId);
  };

  const executeDeleteApplication = async () => {
    if (!confirmDeleteAppId) return;
    const appId = confirmDeleteAppId;
    setConfirmDeleteAppId(null);
    
    try {
      const response = await platformClient.delete(`/applications/${appId}`);
      if (response.status !== 200 && response.status !== 204) {
         throw new Error('Failed to delete application');
      }
      
      // Update local state
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (err) {
      console.error(err);
      alert('Unable to delete application');
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(workspaceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  


  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-12 p-8 relative">
        <Skeleton height="40px" width="300px" className="mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Skeleton height="300px" />
            <Skeleton height="300px" />
        </div>
        <div className="mb-6"><Skeleton height="200px" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center flex-column" style={{ height: '50vh' }}>
        <AlertTriangle size={48} className="text-orange mb-4" />
        <h2 className="text-xl font-bold mb-4">{error}</h2>
        <Button variant="secondary" onClick={() => navigate('/portal')}>Back to Portal</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 p-6 lg:p-8 relative">
      <BackgroundPattern />
      
      <div className="flex-between flex-wrap gap-4 mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-main mb-2 tracking-tight">
            Applications
          </h1>
          <p className="text-muted text-sm font-medium">
            Manage your hosted frontend applications and dashboards.
          </p>
        </div>
      </div>

      {/* Applications */}
      <div className="bg-white border border-gray-200 shadow-sm relative z-10 mb-8" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div className="p-8 pb-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Applications in this Workspace</h2>
        </div>
        
        <div className="p-8 bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app) => (
                <div 
                  key={app.id} 
                  className="bg-white hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 shadow-sm relative group" 
                  style={{ borderRadius: '20px', padding: '24px' }}
                  onClick={() => navigate(`/workspaces/${workspaceId}/applications/${app.id}`)}
                >
                  <div className="flex-between mb-4">
                    <div className="ds-icon-box bg-green-50 text-green rounded-xl" style={{ width: '40px', height: '40px' }}>
                      <Leaf size={20} strokeWidth={1.5} />
                    </div>
                    <Button 
                      variant="icon" 
                      icon={Trash2} 
                      onClick={(e) => requestDeleteApplication(e, app.id)} 
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    />
                  </div>
                  <div className="font-bold text-gray-900 text-[16px] mb-4 truncate">{app.name}</div>
                  <span className="inline-flex items-center rounded-full font-bold uppercase tracking-wide bg-green-100 text-green-700" style={{ gap: '6px', padding: '4px 10px', fontSize: '10px' }}>
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> ACTIVE
                  </span>
                </div>
              ))}

              <div 
                  className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[160px] p-8 border-2 border-dashed border-blue-200 hover:bg-blue-50/50 hover:border-blue-400 group bg-white"
                  style={{ borderRadius: '20px' }}
                  onClick={() => setShowCreateModal(true)}
                >
                  <div className="flex items-center justify-center bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:bg-blue-100 transition-colors" style={{ width: '48px', height: '48px' }}>
                    <Plus size={24} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-blue-600 mb-1 text-[15px]">Create Application</h3>
                  <p className="text-gray-500 text-[13px] font-medium text-center">Add a new application</p>
                </div>
            </div>
        </div>
      </div>

      {/* Create Application Modal Flow */}
      {showCreateModal && (
        <CreateApplicationFlow 
          workspaceId={workspaceId} 
          onClose={() => setShowCreateModal(false)}
          onSuccess={(app) => {
            setShowCreateModal(false);
            navigate(`/workspaces/${workspaceId}/applications/${app.id}`);
          }}
        />
      )}

      <Modal
        isOpen={!!confirmDeleteAppId}
        onClose={() => setConfirmDeleteAppId(null)}
        title="Confirm Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteAppId(null)}>Cancel</Button>
            <Button variant="danger" onClick={executeDeleteApplication}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to permanently delete this application? This action cannot be undone and all associated deployments will be lost.
        </p>
      </Modal>
    </div>
  );
}
