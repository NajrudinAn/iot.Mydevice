import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Box, Users, Search, RefreshCw, AlertCircle, Plus, 
  ArrowRight, ShieldCheck, DoorOpen, LayoutGrid, List, MoreVertical, Smartphone, Building, Info, X, Trash2, Edit2
} from 'lucide-react';
import { getPlatformWorkspaces, platformClient } from '../api/client';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

export default function UserPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [workspaces, setWorkspaces] = useState([]);
  const [sharedApplications, setSharedApplications] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Workspace Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  // Workspace Rename Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameWorkspaceId, setRenameWorkspaceId] = useState(null);
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Shared Application Modal State
  const [selectedSharedApp, setSelectedSharedApp] = useState(null);
  
  const [activeTab, setActiveTab] = useState('workspaces');
  const [viewMode, setViewMode] = useState('grid');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wsRes, sharedRes] = await Promise.all([
        getPlatformWorkspaces(),
        platformClient.get('/users/me/shared-applications')
      ]);
      setWorkspaces(wsRes.workspaces || []);
      setSharedApplications(sharedRes.data.applications || []);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while retrieving data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    try {
      await platformClient.post('/workspaces', { name: newWorkspaceName });
      setShowCreateModal(false);
      setNewWorkspaceName('');
      fetchData();
    } catch (err) {
      console.error("Failed to create workspace:", err);
      alert(err.response?.data?.message || 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      try {
        await platformClient.delete(`/workspaces/${workspaceId}`);
        fetchData();
      } catch (err) {
        console.error("Failed to delete workspace:", err);
        alert(err.response?.data?.message || 'Failed to delete workspace.');
      }
    }
  };

  const openRenameModal = (workspace) => {
    setRenameWorkspaceId(workspace.id);
    setRenameWorkspaceName(workspace.name);
    setShowRenameModal(true);
  };

  const handleRenameWorkspace = async (e) => {
    e.preventDefault();
    if (!renameWorkspaceName.trim()) return;
    setRenaming(true);
    try {
      await platformClient.put(`/workspaces/${renameWorkspaceId}`, { name: renameWorkspaceName });
      setShowRenameModal(false);
      fetchData();
    } catch (err) {
      console.error("Failed to rename workspace:", err);
      alert(err.response?.data?.message || 'Failed to rename workspace.');
    } finally {
      setRenaming(false);
    }
  };

  const navigateToApplication = async (app) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';
      // The user intends for applications to be accessed via their custom hosted frontends
      window.open(`${baseUrl}/hosted/${app.slug}`, '_blank');
    } catch (err) {
      console.error(err);
      alert('Unable to launch application.');
    }
  };

  const navigateToWorkspaceApps = (workspaceId) => {
    navigate(`/workspaces/${workspaceId}/overview`);
  };

  if (error) {
    return (
      <div className="flex-align flex-center" style={{ height: '100%', minHeight: '400px' }}>
        <div className="glass-card text-center p-8" style={{ maxWidth: '400px' }}>
          <AlertCircle size={32} className="text-red mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Unable to load data</h3>
          <p className="text-muted text-sm mb-6">{error}</p>
          <Button variant="secondary" onClick={fetchData} icon={RefreshCw} className="mx-auto">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isCompletelyEmpty = !loading && workspaces.length === 0 && sharedApplications.length === 0;
  
  const getRoleBadgeClass = (role) => {
    if (!role) return 'badge-neutral';
    return role.toUpperCase() === 'OPERATOR' ? 'badge-success' : 'badge-neutral';
  };

  const getIconClass = (index) => {
    const classes = ['bg-orange-light text-orange', 'bg-red-light text-red', 'bg-yellow-light text-yellow', 'bg-purple-light text-purple', 'bg-blue-light text-blue'];
    return classes[index % classes.length];
  };

  return (
    <>
      <style>{`
        .tab-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          border-radius: 10px 10px 0 0;
          transition: all 0.2s ease;
          color: #64748b;
          position: relative;
        }
        .tab-button::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 3px;
          background: transparent;
          border-radius: 3px 3px 0 0;
          transition: all 0.2s ease;
        }
        .tab-button.active {
          color: #2563eb;
        }
        .tab-button.active::after {
          background: #2563eb;
        }
        .tab-button:hover:not(.active) {
          color: #334155;
          background: rgba(15, 23, 42, 0.02);
        }
        
        /* Premium Card Styles */
        .portal-glass-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8);
          overflow: hidden;
          padding: 2rem;
        }
        .portal-item-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8);
          transition: all 0.25s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }
        .grid .portal-item-card {
          min-height: 230px;
        }
        .portal-item-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .ds-icon-premium {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%);
          border: 1px solid rgba(59,130,246,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }
      `}</style>

      <div className="w-full max-w-7xl mx-auto pb-12">
        {/* Header Hero */}
        <div className="flex-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold mb-1 text-main tracking-tight">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-muted text-sm">
              Manage your workspaces and access shared applications.
            </p>
          </div>
          {!isCompletelyEmpty && (
            <Button variant="primary" icon={Plus} size="md" onClick={() => setShowCreateModal(true)}>
              New Workspace
            </Button>
          )}
        </div>

        {/* Tabs Control */}
        {!isCompletelyEmpty && (
          <div className="flex-align mb-6 gap-2 border-b border-gray-200 w-full">
            <button 
              className={`tab-button ${activeTab === 'workspaces' ? 'active' : ''}`}
              onClick={() => setActiveTab('workspaces')}
            >
              <Folder size={16} /> My Workspaces
            </button>
            <button 
              className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              <Users size={16} /> Shared Applications
            </button>
          </div>
        )}

        {isCompletelyEmpty ? (
          <div className="flex-center p-16">
            <div className="portal-glass-card text-center p-12 max-w-lg w-full flex-column flex-center">
              <div className="ds-icon-box bg-blue-light text-blue mb-6" style={{ width: '80px', height: '80px', borderRadius: '50%' }}>
                <Folder size={40} />
              </div>
              <h2 className="text-xl font-bold mb-2">Welcome to MyDevice!</h2>
              <p className="text-muted text-sm mb-8">You don't have any workspaces yet. Create one to start managing your IoT applications and devices.</p>
              <Button variant="primary" icon={Plus} size="lg" onClick={() => setShowCreateModal(true)}>
                Create Your First Workspace
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* My Workspaces Section */}
            {activeTab === 'workspaces' && (
            <div id="workspaces-section" className="portal-glass-card mb-8">
              <div className="flex-between mb-8">
                <div className="flex-align gap-4">
                  <div className="ds-icon-premium">
                    <Folder size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-main mb-1">My Workspaces</h2>
                    <p className="text-sm text-muted">Workspaces you own and manage.</p>
                  </div>
                </div>
                <div className="flex-align gap-2 bg-gray-50 p-1 rounded-md border border-gray-200">
                  <Button variant="icon" className={viewMode === 'grid' ? "bg-white shadow-sm border border-gray-200 text-blue" : "text-muted"} icon={LayoutGrid} size="sm" onClick={() => setViewMode('grid')} />
                  <Button variant="icon" className={viewMode === 'list' ? "bg-white shadow-sm border border-gray-200 text-blue" : "text-muted"} icon={List} size="sm" onClick={() => setViewMode('list')} />
                </div>
              </div>

              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex-column gap-4"}>
                {loading ? (
                  [...Array(2)].map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  workspaces.map(ws => (
                    viewMode === 'grid' ? (
                      <div key={ws.id} className="portal-item-card p-0 flex-column overflow-hidden" onClick={() => navigateToWorkspaceApps(ws.id)}>
                        <div className="p-8 flex-1 flex-column">
                          <div className="flex-between mb-6">
                            <div className="ds-icon-box bg-blue-light text-blue" style={{ width: 44, height: 44, borderRadius: '12px' }}>
                              <Folder size={22} />
                            </div>
                            <div className="flex-align gap-1">
                              <Button 
                                variant="icon" 
                                icon={Edit2} 
                                size="sm"
                                className="text-muted hover:text-blue hover:bg-blue-light" 
                                onClick={(e) => { e.stopPropagation(); openRenameModal(ws); }} 
                              />
                              <Button 
                                variant="icon" 
                                icon={Trash2} 
                                size="sm"
                                className="text-muted hover:text-red hover:bg-red-light" 
                                onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id); }} 
                              />
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-lg mb-2 truncate text-main">{ws.name}</h3>
                          <p className="text-sm text-muted line-clamp-2 mb-auto pb-6">{ws.description || 'Smart farming solutions and monitoring'}</p>
                          
                          <div className="grid grid-cols-2 gap-4 mt-auto">
                            <div className="flex-align gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <div className="ds-icon-box bg-white shadow-sm" style={{ width: 36, height: 36, borderRadius: '8px' }}>
                                  <Box size={16} className="text-blue" />
                              </div>
                              <div>
                                <div className="font-bold text-lg leading-none mb-1 text-main">{ws.application_count ?? 0}</div>
                                <div className="text-[11px] text-muted tracking-wide uppercase font-semibold">Apps</div>
                              </div>
                            </div>
                            <div className="flex-align gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <div className="ds-icon-box bg-white shadow-sm" style={{ width: 36, height: 36, borderRadius: '8px' }}>
                                  <Smartphone size={16} className="text-green" />
                              </div>
                              <div>
                                <div className="font-bold text-lg leading-none mb-1 text-main">{ws.device_count ?? 0}</div>
                                <div className="text-[11px] text-muted tracking-wide uppercase font-semibold">Devices</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={ws.id} className="portal-item-card p-5 flex-between gap-4" style={{ flexDirection: 'row' }} onClick={() => navigateToWorkspaceApps(ws.id)}>
                        <div className="flex-align gap-4 min-w-0 flex-1">
                          <div className="ds-icon-box bg-blue-light text-blue shrink-0" style={{ width: 44, height: 44, borderRadius: '12px' }}>
                            <Folder size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-base mb-0.5 truncate text-main">{ws.name}</h3>
                            <p className="text-sm text-muted truncate">{ws.description || 'Smart farming solutions and monitoring'}</p>
                          </div>
                        </div>

                        <div className="flex-align gap-6 shrink-0 mr-4">
                          <div className="flex-align gap-2">
                              <Box size={16} className="text-blue" />
                              <span className="font-bold text-sm">{ws.application_count ?? 0}</span>
                              <span className="text-xs text-muted uppercase font-semibold">Apps</span>
                          </div>
                          <div className="flex-align gap-2">
                              <Smartphone size={16} className="text-green" />
                              <span className="font-bold text-sm">{ws.device_count ?? 0}</span>
                              <span className="text-xs text-muted uppercase font-semibold">Devices</span>
                          </div>
                        </div>

                        <div className="flex-align gap-2 shrink-0">
                          <Button 
                            variant="icon" 
                            icon={Edit2} 
                            size="sm"
                            className="text-muted hover:text-blue hover:bg-blue-light" 
                            onClick={(e) => { e.stopPropagation(); openRenameModal(ws); }} 
                          />
                          <Button 
                            variant="icon" 
                            icon={Trash2} 
                            size="sm"
                            className="text-muted hover:text-red hover:bg-red-light" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id); }} 
                          />
                        </div>
                      </div>
                    )
                  ))
                )}
                
                {/* Create New Workspace Dotted Card */}
                {!loading && (
                  <div 
                    className={`flex-center cursor-pointer transition-all duration-200 p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 hover:bg-blue-50 hover:border-blue-500 ${viewMode === 'grid' ? 'flex-column min-h-[200px]' : 'flex-row'}`}
                    onClick={() => setShowCreateModal(true)}
                  >
                    <div className="flex-align flex-center gap-3">
                      <Plus size={20} className="text-blue" />
                      <h3 className="font-bold text-blue text-base m-0">Create New Workspace</h3>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Shared Applications Section */}
            {activeTab === 'applications' && (
            <div id="shared-section" className="portal-glass-card mb-8">
              <div className="flex-between mb-8">
                <div className="flex-align gap-4">
                  <div className="ds-icon-premium" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 100%)', borderColor: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-main mb-1">Shared Applications</h2>
                    <p className="text-sm text-muted">Applications shared with you by other workspace owners.</p>
                  </div>
                </div>
              </div>

              {sharedApplications.length === 0 && !loading ? (
                <div className="text-center border border-dashed border-gray-200 bg-gray-50" style={{ padding: '64px 24px', borderRadius: '16px' }}>
                  <Users size={32} className="text-muted mx-auto mb-3" />
                  <h3 className="text-base font-bold text-main mb-1">No shared applications</h3>
                  <p className="text-muted text-sm">Applications shared with you will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading ? (
                    [...Array(2)].map((_, i) => <SkeletonCard key={i} />)
                  ) : (
                    sharedApplications.map((app, idx) => (
                      <div key={app.id} className="portal-item-card p-0 flex-column overflow-hidden" onClick={() => setSelectedSharedApp(app)}>
                        <div className="p-8 flex-1 flex-column">
                          <div className="flex-between mb-6">
                            <div className={`ds-icon-box ${getIconClass(idx)}`} style={{ width: 44, height: 44, borderRadius: '12px' }}>
                              <Box size={22} />
                            </div>
                            <span className={`badge ${getRoleBadgeClass(app.user_role)} uppercase tracking-wide px-3 py-1`}>
                              {app.user_role?.toLowerCase() || 'Viewer'}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-xl mb-2 truncate text-main">{app.name}</h3>
                          <p className="text-sm text-muted truncate mb-auto pb-6">Shared by: {app.workspace_owner_name || 'Admin User'}</p>
                          
                          <div className="mt-auto p-4 rounded-xl bg-gray-50 border border-gray-100 flex-align gap-3 text-sm text-muted truncate">
                            <div className="ds-icon-box bg-white shadow-sm shrink-0" style={{ width: 32, height: 32, borderRadius: '8px' }}>
                              <Building size={14} className="text-indigo-500" />
                            </div>
                            <span className="truncate font-medium text-main">Workspace: {app.workspace_name}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            )}

            {/* Bottom Tip Banner */}
            <div className="glass-card bg-blue-50/50 border-blue-200 p-5">
              <div className="flex-align gap-3 text-blue-700 text-sm font-medium">
                <Info size={18} /> Tip: Create a workspace to organize your applications, devices, and data in one place.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Workspace</h2>
              <Button variant="icon" icon={X} onClick={() => setShowCreateModal(false)} />
            </div>
            <form onSubmit={handleCreateWorkspace}>
              <div className="modal-body">
                <p className="text-muted text-sm mb-6">A workspace acts as a container for your applications and devices.</p>
                <div className="form-group mb-0">
                  <label className="form-label">Workspace Name <span className="text-red">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. My IoT Project"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <Button 
                  variant="secondary"
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary"
                  type="submit" 
                  disabled={creating || !newWorkspaceName.trim()}
                  loading={creating}
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Workspace Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Rename Workspace</h2>
              <Button variant="icon" icon={X} onClick={() => setShowRenameModal(false)} />
            </div>
            <form onSubmit={handleRenameWorkspace}>
              <div className="modal-body">
                <div className="form-group mb-0">
                  <label className="form-label">New Name <span className="text-red">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={renameWorkspaceName}
                    onChange={(e) => setRenameWorkspaceName(e.target.value)}
                    placeholder="Enter new workspace name"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <Button 
                  variant="secondary"
                  type="button" 
                  onClick={() => setShowRenameModal(false)}
                  disabled={renaming}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary"
                  type="submit" 
                  disabled={renaming || !renameWorkspaceName.trim()}
                  loading={renaming}
                >
                  {renaming ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Shared Application Info Modal */}
      {selectedSharedApp && (
        <div className="modal-overlay" onClick={() => setSelectedSharedApp(null)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Shared Application</h2>
              <Button variant="icon" icon={X} onClick={() => setSelectedSharedApp(null)} />
            </div>
            <div className="modal-body p-6">
              <div className="flex-column gap-6">
                <div className="flex-align gap-4 border-b border-gray-100 pb-6">
                  <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                    <Box size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-main">{selectedSharedApp.name}</h3>
                    <div className="text-sm text-muted flex-align gap-2">
                      <span className={`badge uppercase tracking-wide bg-gray-100 text-gray-700`}>
                        {selectedSharedApp.user_role || 'Viewer'} Access
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex-between">
                    <span className="text-sm text-muted">Shared By:</span>
                    <span className="text-sm font-medium text-main">{selectedSharedApp.workspace_owner_name || 'Admin'}</span>
                  </div>
                  <div className="flex-between">
                    <span className="text-sm text-muted">Workspace:</span>
                    <span className="text-sm font-medium text-main">{selectedSharedApp.workspace_name}</span>
                  </div>
                  <div className="flex-between">
                    <span className="text-sm text-muted">Application ID:</span>
                    <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded truncate max-w-[200px]">
                      {selectedSharedApp.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer flex-between bg-gray-50 p-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setSelectedSharedApp(null)}>Close</Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  navigateToApplication(selectedSharedApp);
                  setSelectedSharedApp(null);
                }}
                icon={ArrowRight}
              >
                Launch Application
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
