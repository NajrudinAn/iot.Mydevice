import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Shield, Users, Server, LayoutDashboard, 
  Terminal, Activity, RefreshCw, AlertCircle, ChevronRight, 
  CheckCircle2, Copy, CheckCircle, ArrowLeft, UploadCloud, Globe, Code, ArrowRight, Plus, AlertTriangle
} from 'lucide-react';
import { 
  getApplicationDetails, getApplicationUsers, getApplicationDevices, 
  getApplicationDashboards, getApplicationApis, getWorkspace, platformClient,
  updateApplicationUser, removeApplicationUser
} from '../api/client';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import FileExplorer from '../components/FileExplorer';
import Modal from '../components/ui/Modal';

export default function PlatformApplicationInspection() {
  const { workspaceId, applicationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [workspace, setWorkspace] = useState(null);
  const [application, setApplication] = useState(null);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [workspaceApis, setWorkspaceApis] = useState([]);

  // Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Copy ID State
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  // Deployments State
  const [deployments, setDeployments] = useState([]);
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [selectedDeploymentForFiles, setSelectedDeploymentForFiles] = useState(null);
  const [deploymentFiles, setDeploymentFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [confirmRollbackDeploymentId, setConfirmRollbackDeploymentId] = useState(null);
  const [confirmDeleteDeploymentId, setConfirmDeleteDeploymentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const [isEditingApis, setIsEditingApis] = useState(false);
  const [editAuthApiId, setEditAuthApiId] = useState('');
  const [editAccessApiIds, setEditAccessApiIds] = useState([]);
  const [savingApis, setSavingApis] = useState(false);
  
  const [newApiSecret, setNewApiSecret] = useState(null);
  const [generatingCredentials, setGeneratingCredentials] = useState(false);

  // Add User Modal
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('VIEWER');
  const [addingUser, setAddingUser] = useState(false);

  // Add Domain Modal
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  const [domains, setDomains] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wsRes, appRes, usersRes, devicesRes, wsApisRes, domainsRes] = await Promise.all([
        getWorkspace(workspaceId).catch(() => ({ workspace: null })),
        getApplicationDetails(applicationId).catch(() => ({ application: null })),
        getApplicationUsers(applicationId).catch(() => ({ users: [] })),
        getApplicationDevices(applicationId).catch(() => ({ devices: [] })),
        platformClient.get(`/workspaces/${workspaceId}/api-management/apis`).then(r => r.data).catch(() => ({ apis: [] })),
        platformClient.get(`/applications/${applicationId}/domains`).then(r => r.data).catch(() => ({ domains: [] }))
      ]);

      if (!appRes.application) {
        throw new Error('Application could not be found or you are unauthorized.');
      }

      setWorkspace(wsRes.workspace);
      setApplication(appRes.application);
      setUsers(usersRes.users || []);
      setDevices(devicesRes.devices || []);
      setWorkspaceApis(wsApisRes.apis || []);
      setDomains(domainsRes.domains || []);
      
      fetchDeployments();
    } catch (err) {
      console.error(err);
      setError(err.message || "We couldn't retrieve this application right now.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeployments = async () => {
    setLoadingDeployments(true);
    try {
      const res = await platformClient.get(`/applications/${applicationId}/deployments`);
      setDeployments(res.data.deployments || []);
    } catch (err) {
      console.error('Failed to load deployments', err);
    } finally {
      setLoadingDeployments(false);
    }
  };

  const fetchDeploymentFiles = async (deploymentId) => {
    setSelectedDeploymentForFiles(deploymentId);
    setLoadingFiles(true);
    try {
      const res = await platformClient.get(`/applications/${applicationId}/deployments/${deploymentId}/files`);
      setDeploymentFiles(res.data.files || []);
    } catch (err) {
      console.error('Failed to load files', err);
      setDeploymentFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleRollback = (deploymentId) => {
    setConfirmRollbackDeploymentId(deploymentId);
  };

  const executeRollback = async () => {
    if (!confirmRollbackDeploymentId) return;
    const deploymentId = confirmRollbackDeploymentId;
    setConfirmRollbackDeploymentId(null);
    
    setRollingBackId(deploymentId);
    try {
      await platformClient.post(`/applications/${applicationId}/deployments/${deploymentId}/activate`);
      showToast('Deployment activated successfully');
      fetchDeployments();
    } catch (err) {
      console.error('Failed to rollback', err);
      alert('Failed to rollback deployment.');
    } finally {
      setRollingBackId(null);
    }
  };

  const handleDelete = (deploymentId) => {
    setConfirmDeleteDeploymentId(deploymentId);
  };

  const executeDelete = async () => {
    if (!confirmDeleteDeploymentId) return;
    const deploymentId = confirmDeleteDeploymentId;
    setConfirmDeleteDeploymentId(null);
    
    setDeletingId(deploymentId);
    try {
      await platformClient.delete(`/applications/${applicationId}/deployments/${deploymentId}`);
      showToast('Deployment deleted successfully');
      fetchDeployments();
    } catch (err) {
      console.error('Failed to delete deployment', err);
      alert(err.response?.data?.message || 'Failed to delete deployment.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditApisModal = () => {
    setEditAccessApiIds(application.api_access_ids || []);
    setIsEditingApis(true);
  };

  const saveApiConfiguration = async () => {
    setSavingApis(true);
    try {
      await platformClient.patch(`/applications/${applicationId}`, {
        api_access_ids: editAccessApiIds
      });
      setApplication(prev => ({ 
        ...prev, 
        api_access_ids: editAccessApiIds 
      }));
      showToast('API Configuration updated');
      setIsEditingApis(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update API Configuration');
    } finally {
      setSavingApis(false);
    }
  };

  const toggleDeploymentMode = async () => {
    const newMode = application.deployment_mode === 'DEPLOYED' ? 'DEVELOPMENT' : 'DEPLOYED';
    try {
      await platformClient.patch(`/applications/${applicationId}`, {
        deployment_mode: newMode
      });
      setApplication(prev => ({ ...prev, deployment_mode: newMode }));
      showToast(`Mode switched to ${newMode}`);
    } catch (err) {
      console.error('Failed to change mode', err);
      alert('Failed to change deployment mode');
    }
  };

  const toggleRegistration = async () => {
    try {
      const newReg = !application.registration_enabled;
      const res = await platformClient.patch(`/applications/${applicationId}/auth/settings`, {
        registration_enabled: newReg
      });
      if (res.data.success) {
        setApplication({...application, registration_enabled: newReg});
        showToast(newReg ? 'Registration enabled' : 'Registration disabled');
      }
    } catch (err) {
      alert('Failed to update registration settings: ' + (err.response?.data?.message || err.message));
    }
  };


  useEffect(() => {
    fetchData();
  }, [workspaceId, applicationId]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(applicationId);
    setCopiedId(true);
    showToast('Application ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRegenerateCredentials = async () => {
    if (!window.confirm("Are you sure you want to regenerate the API credentials? Any existing external clients using the old credentials will immediately lose access.")) return;
    
    setGeneratingCredentials(true);
    try {
      const res = await platformClient.post(`/applications/${applicationId}/credentials/regenerate`);
      setApplication(prev => ({ ...prev, api_key: res.data.api_key }));
      setNewApiSecret(res.data.api_secret);
      showToast('API Credentials regenerated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to regenerate credentials');
    } finally {
      setGeneratingCredentials(false);
    }
  };

  const handleCopySecret = () => {
    if (newApiSecret) {
      navigator.clipboard.writeText(newApiSecret);
      showToast('API Secret copied');
    }
  };

  const handleCopyKey = () => {
    if (application?.api_key) {
      navigator.clipboard.writeText(application.api_key);
      showToast('API Key copied');
    }
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('frontend_zip', file);

    setUploading(true);
    setUploadMessage({ type: 'info', text: 'Uploading and extracting...' });

    try {
      const res = await platformClient.post(`/applications/${applicationId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadMessage({ type: 'success', text: res.data.message });
      e.target.value = null; // reset
      fetchDeployments();
    } catch (err) {
      setUploadMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload frontend' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail) return;
    setAddingUser(true);
    try {
      await platformClient.post(`/applications/${applicationId}/users`, {
        email: newUserEmail,
        role: newUserRole
      });
      showToast('User added successfully');
      setIsAddingUser(false);
      setNewUserEmail('');
      setNewUserRole('VIEWER');
      const usersRes = await getApplicationUsers(applicationId);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this user from the application?")) return;
    try {
      await removeApplicationUser(applicationId, userId);
      showToast('User removed successfully');
      const usersRes = await getApplicationUsers(applicationId);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const handleUpdateUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'VIEWER' : 'ADMIN';
    try {
      await updateApplicationUser(applicationId, userId, newRole);
      showToast(`User role updated to ${newRole}`);
      const usersRes = await getApplicationUsers(applicationId);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleAddDomain = async () => {
    if (!newDomainName) return;
    setAddingDomain(true);
    try {
      await platformClient.post(`/applications/${applicationId}/domains`, {
        hostname: newDomainName,
        type: 'CUSTOM_DOMAIN'
      });
      showToast('Domain added successfully');
      setIsAddingDomain(false);
      setNewDomainName('');
      const domainsRes = await platformClient.get(`/applications/${applicationId}/domains`);
      setDomains(domainsRes.data.domains || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  if (error) {
    return (
      <div className="flex-center flex-column" style={{ height: '50vh', flexDirection: 'column' }}>
        <AlertCircle size={48} className="text-orange mb-4" />
        <h2 className="text-xl font-bold mb-2">Unable to load application</h2>
        <p className="text-muted mb-6">{error}</p>
        <div className="flex-align gap-4">
            <Button variant="secondary" onClick={() => navigate(`/workspaces/${workspaceId}/applications`)}>Back to Workspace</Button>
            <Button variant="primary" onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  const onlineDevices = devices.filter(d => d.status === 'online' || d.status === 'ONLINE').length;

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors ${
        activeTab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
      style={{ cursor: 'pointer' }}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="animate-fade-in relative">
      {/* Toast */}
      {toastMessage && createPortal(
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#1e293b', color: '#ffffff', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 999999, fontSize: '14px', fontWeight: 500 }}>
          <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
          {toastMessage}
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex-between mb-8">
        <div>
          <div className="flex-align gap-2 mb-2">
            <button 
              className="text-muted hover:text-main transition-colors flex-align gap-1 text-[13px] font-semibold"
              onClick={() => navigate(`/workspaces/${workspaceId}/applications`)}
            >
              <ArrowLeft size={14} /> Back to Applications
            </button>
          </div>
          <div className="flex-align gap-4">
            <div className="ds-icon-box bg-blue-100 text-blue-600 rounded-xl" style={{ width: '48px', height: '48px' }}>
              <LayoutDashboard size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-main m-0 leading-tight">
                {loading ? <Skeleton width="200px" height="28px" /> : application?.name}
              </h1>
              <div className="text-[13px] text-muted font-medium mt-1">
                {loading ? <Skeleton width="120px" height="18px" /> : application?.slug}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-align gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>Refresh</Button>
          {!loading && application && (
            <Button 
              variant="primary" 
              icon={ArrowRight} 
              onClick={() => {
                const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
                window.open(`${baseUrl}/hosted/${application.slug}`, '_blank');
              }}
            >
              Open App
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <TabButton id="overview" icon={Activity} label="Overview" />
        <TabButton id="apis" icon={Code} label="APIs & Access" />
        <TabButton id="hosting" icon={UploadCloud} label="Hosting" />
        <TabButton id="domain" icon={Globe} label="Domain" />
        <TabButton id="users" icon={Users} label="Users" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard height="150px" />
            <SkeletonCard height="150px" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <div className="text-muted text-[12px] font-bold uppercase tracking-wider mb-2">Application ID</div>
                <div className="flex-align gap-2">
                  <div className="font-mono text-[13px] text-main font-medium">{application.id}</div>
                  <button onClick={handleCopyId} className="text-muted hover:text-blue-500 transition-colors">
                    {copiedId ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="text-muted text-[12px] font-bold uppercase tracking-wider mb-2">Deployment Mode</div>
                <div className="flex-align gap-2">
                  <Badge variant={application.deployment_mode === 'DEPLOYED' ? 'success' : 'warning'}>
                    {application.deployment_mode}
                  </Badge>
                  <button 
                    onClick={toggleDeploymentMode}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                  >
                    Switch
                  </button>
                </div>
              </div>
              
              {application.authentication_api_id && (
                <div className="glass-card p-6">
                  <div className="text-muted text-[12px] font-bold uppercase tracking-wider mb-2">Allow Public Signup</div>
                  <div className="flex-between">
                    <span className="text-[13px] text-main font-medium">
                      {application.registration_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={application.registration_enabled || false}
                        onChange={toggleRegistration}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted mt-2">Allows users to register an account directly from the application's login screen.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hosting' && (
            <div className="space-y-6">
              <div className="glass-card p-8">
                <h3 className="text-[15px] font-bold text-slate-800 mb-2">Static Frontend Hosting</h3>
                <p className="text-slate-500 text-[13px] mb-8">Upload a ZIP file containing your static frontend built assets. The <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-500 font-mono text-[11px]">index.html</code> file must be at the root of the ZIP, or inside a single top-level folder.</p>

                <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 px-8 flex-column flex-center bg-slate-50/50 hover:bg-blue-50/30 transition-colors my-4">
                  <div className="flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mb-5" style={{ width: '64px', height: '64px' }}>
                    <UploadCloud size={32} />
                  </div>
                  <h4 className="font-bold text-main mb-1">Upload frontend zip</h4>
                  <p className="text-muted text-[13px] mb-6">Max 50MB upload, 150MB extracted. Both flat ZIPs and zipped folders are supported.</p>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".zip,application/zip" 
                      onChange={handleZipUpload}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="primary" loading={uploading}>
                      Select ZIP File
                    </Button>
                  </div>
                </div>

                {uploadMessage && (
                  <div className={`mt-4 p-4 rounded-xl text-[13px] font-medium border ${
                    uploadMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 
                    uploadMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {uploadMessage.text}
                  </div>
                )}
              </div>

              {/* Deployments Section */}
              <div className="mt-8">
                <h3 className="text-[15px] font-bold text-slate-800 mb-4">Deployment History</h3>
                
                {loadingDeployments ? (
                  <Skeleton height="200px" />
                ) : deployments.length === 0 ? (
                  <div className="text-center py-10 bg-white border border-slate-200 rounded-xl text-slate-500 text-sm shadow-sm">No deployments found.</div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="py-4 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[35%]">Version</th>
                            <th className="py-4 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="py-4 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Uploaded</th>
                            <th className="py-4 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Size & Files</th>
                            <th className="py-4 px-5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[120px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {deployments.map((dep, index) => (
                            <tr key={dep.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                              <td className={`py-4 px-5 ${index !== deployments.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                <div className="font-bold text-slate-800 text-[14px]">v{dep.version_number}</div>
                                <div className="text-slate-500 text-[12px] mt-0.5 font-mono truncate max-w-[150px]" title={dep.id}>{dep.id.split('-')[0]}...</div>
                              </td>
                              <td className={`py-4 px-5 ${index !== deployments.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                {dep.status === 'ACTIVE' ? (
                                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-100 text-green-700 text-[11px] font-bold uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className={`py-4 px-5 ${index !== deployments.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                <div className="text-slate-700 font-medium">{new Date(dep.created_at).toLocaleDateString()}</div>
                                <div className="text-slate-500 text-[12px] mt-0.5">{new Date(dep.created_at).toLocaleTimeString()}</div>
                              </td>
                              <td className={`py-4 px-5 ${index !== deployments.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                <div className="text-slate-700 font-medium">{(dep.total_size / 1024).toFixed(1)} KB</div>
                                <div className="text-slate-500 text-[12px] mt-0.5">{dep.file_count} files</div>
                              </td>
                              <td className={`py-4 px-5 ${index !== deployments.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => fetchDeploymentFiles(dep.id)}
                                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Files"
                                  >
                                    <Code size={17} strokeWidth={2.5} />
                                  </button>
                                  {dep.status !== 'ACTIVE' ? (
                                    <button 
                                      onClick={() => handleRollback(dep.id)}
                                      disabled={rollingBackId === dep.id}
                                      className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                      title="Rollback to this version"
                                    >
                                      <RefreshCw size={17} strokeWidth={2.5} className={rollingBackId === dep.id ? 'animate-spin' : ''} />
                                    </button>
                                  ) : (
                                    <div className="w-[29px]"></div>
                                  )}
                                  <button 
                                    onClick={() => handleDelete(dep.id)}
                                    disabled={dep.status === 'ACTIVE' || deletingId === dep.id}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" 
                                    title={dep.status === 'ACTIVE' ? "Cannot delete active deployment" : "Delete deployment"}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={deletingId === dep.id ? 'animate-pulse' : ''}><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                )}
              </div>

              {selectedDeploymentForFiles && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  {/* Backdrop */}
                  <div 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', cursor: 'pointer', transition: 'opacity 0.2s' }}
                    onClick={() => setSelectedDeploymentForFiles(null)}
                  ></div>
                  
                  {/* Modal */}
                  <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                      <div>
                        <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                          <Code size={18} className="text-blue-500" />
                          Deployment Files
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          Browsing contents of deployment v{deployments.find(d => d.id === selectedDeploymentForFiles)?.version_number}
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedDeploymentForFiles(null)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Close File Explorer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <div className="p-5 max-h-[500px] overflow-y-auto bg-slate-50">
                      {loadingFiles ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-4">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <div className="text-sm text-slate-500 font-medium">Loading files...</div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          <FileExplorer files={deploymentFiles} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          {activeTab === 'apis' && (
            <div className="space-y-6">
              <div className="flex-between">
                <h2 className="text-[16px] font-bold text-slate-800">API Configuration</h2>
                <Button variant="secondary" size="sm" onClick={openEditApisModal}>Edit Configuration</Button>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-[15px] font-bold text-main mb-4">API Access Grants</h3>
                <p className="text-muted text-[13px] mb-4">The API Packages this application is authorized to query.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(application.api_access_ids || []).map(apiId => {
                    const api = workspaceApis.find(a => a.id === apiId);
                    return (
                      <div key={apiId} className="p-4 border border-gray-200 rounded-xl flex flex-col gap-2">
                        <div className="flex-align gap-3">
                          <CheckCircle2 size={18} className="text-green-500" />
                          <div>
                            <div className="font-bold text-[14px] text-main">{api?.name || apiId}</div>
                            <div className="text-[12px] text-muted">{api?.auth_mode}</div>
                          </div>
                        </div>
                        {api?.routes?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Included Routes</div>
                            <div className="flex flex-col gap-2">
                              {api.routes.map(r => (
                                <div key={r.id} className="flex items-center justify-between bg-gray-50 px-2 py-2 rounded-lg border border-gray-200">
                                   <div className="flex items-center gap-2">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold ${r.method === 'GET' ? 'bg-blue-100 text-blue-700' : r.method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                       {r.method}
                                     </span>
                                     <span className="font-mono text-gray-700 text-[11px]">/{r.endpoint_slug}</span>
                                   </div>
                                   <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{r.purpose}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!application.api_access_ids || application.api_access_ids.length === 0) && (
                    <div className="text-[13px] text-muted col-span-2">No API access assigned.</div>
                  )}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-main">Static API Credentials</h3>
                    <p className="text-muted text-[13px]">Use these credentials to authenticate external frontends or services directly as the Application (bypassing user login).</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={handleRegenerateCredentials} loading={generatingCredentials}>
                    Regenerate Credentials
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[12px] font-bold text-muted uppercase tracking-wider mb-2">API Key (X-App-Key)</div>
                    <div className="flex-align gap-2">
                      <div className="flex-1 bg-slate-50 border border-gray-200 rounded-lg p-3 font-mono text-[13px] text-main">
                        {application.api_key || 'Not generated'}
                      </div>
                      <Button variant="secondary" icon={Copy} onClick={handleCopyKey} disabled={!application.api_key}>Copy</Button>
                    </div>
                  </div>

                  {newApiSecret && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-bold text-[14px] text-orange-800 mb-1">New API Secret (X-App-Secret)</h4>
                          <p className="text-[13px] text-orange-700 mb-3">Copy this secret now. You will not be able to see it again.</p>
                          <div className="flex-align gap-2">
                            <div className="flex-1 bg-white border border-orange-200 rounded-lg p-3 font-mono text-[13px] text-orange-900 break-all">
                              {newApiSecret}
                            </div>
                            <Button variant="primary" icon={Copy} onClick={handleCopySecret}>Copy</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'domain' && (
            <div className="glass-card p-6">
              <div className="flex-between mb-4">
                <div>
                  <h3 className="text-[15px] font-bold text-main">Domain Configuration</h3>
                  <p className="text-muted text-[13px]">Manage Custom Domains and CORS origins.</p>
                </div>
                <Button variant="secondary" icon={Plus} onClick={() => setIsAddingDomain(true)}>Add Custom Domain</Button>
              </div>
              
              <div className="p-6 bg-slate-50 border border-gray-200 rounded-xl mb-4">
                <div className="text-[12px] font-bold text-muted uppercase tracking-wider mb-2">Default Platform Domain</div>
                <div className="font-mono text-[14px] text-main">{application.slug}.MyDevice.in</div>
              </div>
              
              <div className="space-y-3">
                {domains.map(d => (
                  <div key={d.id} className="p-4 bg-white border border-gray-200 rounded-lg flex-between">
                    <div>
                      <div className="font-mono text-[14px] text-main font-bold">{d.hostname}</div>
                      <div className="text-[12px] text-muted mt-1">{d.type}</div>
                    </div>
                    <Badge variant={d.status === 'ACTIVE' ? 'success' : 'warning'}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-card p-0">
              <div className="p-6 border-b border-gray-100 flex-between">
                <h3 className="text-[15px] font-bold text-main m-0">Application Users</h3>
                <Button variant="secondary" icon={Plus} onClick={() => setIsAddingUser(true)}>Add User</Button>
              </div>
              <div className="table-container border-t-0 rounded-t-none">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="font-bold text-main">{u.name}</div>
                          <div className="text-[12px] text-muted">{u.email}</div>
                        </td>
                        <td><Badge variant="blue">{u.role}</Badge></td>
                        <td><Badge variant={u.status === 'ACTIVE' ? 'success' : 'warning'}>{u.status}</Badge></td>
                        <td className="text-right">
                          <div className="flex-align gap-2" style={{ justifyContent: 'flex-end' }}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleUpdateUserRole(u.id, u.role)}
                            >
                              Make {u.role === 'ADMIN' ? 'Viewer' : 'Admin'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              style={{ color: 'var(--red)' }}
                              onClick={() => handleRemoveUser(u.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-8 text-[13px]">No users explicitly assigned.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isEditingApis}
        onClose={() => setIsEditingApis(false)}
        title="Configure API Access"
        className="w-full max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditingApis(false)} disabled={savingApis}>Cancel</Button>
            <Button variant="primary" onClick={saveApiConfiguration} loading={savingApis}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">API Access Grants</label>
            <p className="text-xs text-slate-500 mb-3">Select which API Packages this application is authorized to query.</p>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {workspaceApis.map(api => (
                <label key={api.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={editAccessApiIds.includes(api.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditAccessApiIds(prev => [...prev, api.id]);
                      } else {
                        setEditAccessApiIds(prev => prev.filter(id => id !== api.id));
                      }
                    }}
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">{api.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{api.routes?.length || 0} routes</div>
                  </div>
                </label>
              ))}
              {workspaceApis.length === 0 && (
                <div className="text-sm text-slate-500 py-2">No API Packages found in this workspace.</div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmRollbackDeploymentId}
        onClose={() => setConfirmRollbackDeploymentId(null)}
        title="Confirm Rollback"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRollbackDeploymentId(null)}>Cancel</Button>
            <Button variant="primary" onClick={executeRollback}>Confirm Rollback</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to rollback to this deployment? This will immediately change the live hosted application.
        </p>
      </Modal>

      <Modal
        isOpen={!!confirmDeleteDeploymentId}
        onClose={() => setConfirmDeleteDeploymentId(null)}
        title="Confirm Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteDeploymentId(null)}>Cancel</Button>
            <Button variant="danger" onClick={executeDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to permanently delete this deployment? This action cannot be undone and will permanently erase the uploaded assets.
        </p>
      </Modal>
      <Modal
        isOpen={isAddingUser}
        onClose={() => setIsAddingUser(false)}
        title="Add User to Application"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddingUser(false)} disabled={addingUser}>Cancel</Button>
            <Button variant="primary" onClick={handleAddUser} loading={addingUser}>Add User</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">User Email</label>
            <input 
              type="email" 
              className="ds-input w-full"
              placeholder="user@example.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">The user must already have a MyDevice platform account.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
            <select className="ds-input w-full" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
              <option value="VIEWER">Viewer</option>
              <option value="OPERATOR">Operator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddingDomain}
        onClose={() => setIsAddingDomain(false)}
        title="Add Custom Domain"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddingDomain(false)} disabled={addingDomain}>Cancel</Button>
            <Button variant="primary" onClick={handleAddDomain} loading={addingDomain}>Add Domain</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Domain Name</label>
            <input 
              type="text" 
              className="ds-input w-full font-mono"
              placeholder="e.g. app.mydomain.com"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">Enter the hostname without https:// or paths.</p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
