import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApi, createCredential, revokeCredential, addApiUser, removeApiUser, updateApi, deleteApi } from '../api/apiManagement';
import { ArrowLeft, Key, Code, Users, FileText, Plus, Trash2, Home, Share2, BookOpen, Edit2, MoreHorizontal, Info, Package, ChevronRight, Copy } from 'lucide-react';
import { platformClient as api } from '../api/client';
import EditApiModal from '../components/apis/EditApiModal';
import AttachRouteModal from '../components/apis/AttachRouteModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const WorkspaceApiDetails = () => {
    const { workspaceId, apiId } = useParams();
    const navigate = useNavigate();
    
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Modals
    const [isCredModalOpen, setIsCredModalOpen] = useState(false);
    const [isAttachRouteModalOpen, setIsAttachRouteModalOpen] = useState(false);
    const [isEditApiModalOpen, setIsEditApiModalOpen] = useState(false);
    const [newCredName, setNewCredName] = useState('');
    const [generatedSecret, setGeneratedSecret] = useState(null);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [appUsers, setAppUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: 'Confirm',
        confirmVariant: 'danger'
    });

    const loadApiData = async () => {
        try {
            setLoading(true);
            const res = await getApi(workspaceId, apiId);
            setApiData(res.data.api);
        } catch (error) {
            console.error('Failed to load API details', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApiData();
    }, [workspaceId, apiId]);

    const handleCreateCredential = async (e) => {
        e.preventDefault();
        try {
            const res = await createCredential(workspaceId, apiId, { name: newCredName });
            setGeneratedSecret(res.data.credential.secret);
            loadApiData();
            setNewCredName('');
        } catch (error) {
            alert('Failed to generate credential');
        }
    };

    const handleRevokeCredential = async (credId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Revoke Credential',
            message: 'Are you sure you want to revoke this credential? It will stop working immediately.',
            confirmText: 'Revoke',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await revokeCredential(workspaceId, apiId, credId);
                    loadApiData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert('Failed to revoke credential');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDetachRoute = async (routeIdToDetach) => {
        setConfirmModal({
            isOpen: true,
            title: 'Detach Route',
            message: 'Are you sure you want to detach this route from this API? The route itself will not be deleted.',
            confirmText: 'Detach Route',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    const newRouteIds = apiData.routes.filter(r => r.id !== routeIdToDetach).map(r => r.id);
                    await updateApi(workspaceId, apiId, { route_ids: newRouteIds });
                    loadApiData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert('Failed to detach route');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDeleteApi = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete API Package',
            message: 'Are you sure you want to delete this API package? This action cannot be undone.',
            confirmText: 'Delete API',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await deleteApi(workspaceId, apiId);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    navigate(`/workspaces/${workspaceId}/apis?tab=apis`);
                } catch (error) {
                    alert('Failed to delete API');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const loadAppUsers = async () => {
        // Load workspace application users
        const res = await api.get(`/workspaces/${workspaceId}/users`); // mock/placeholder
        // Assuming we have an endpoint or we can mock for now
    };

    if (loading) return <div className="p-6 text-gray-500">Loading API details...</div>;
    if (!apiData) return <div className="p-6 text-red-500">API not found</div>;

    const renderOverview = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center mb-6" style={{ gap: '1rem' }}>
                    <div className="flex items-center justify-center shrink-0" style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                        <Info size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900" style={{ fontSize: '18px' }}>API Configuration</h3>
                        <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>Key details about this API package.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1.25rem 3rem' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                            <dt className="font-semibold text-gray-900" style={{ fontSize: '14px' }}>Name</dt>
                            <dd className="text-gray-700 font-medium" style={{ fontSize: '14px' }}>{apiData.name}</dd>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'flex-start' }}>
                            <dt className="font-semibold text-gray-900 mt-0.5" style={{ fontSize: '14px' }}>Description</dt>
                            <dd className="text-gray-700 font-medium" style={{ fontSize: '14px' }}>{apiData.description || 'N/A'}</dd>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                            <dt className="font-semibold text-gray-900" style={{ fontSize: '14px' }}>Status</dt>
                            <dd style={{ fontSize: '14px' }}>
                                <span className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${apiData.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`} style={{ gap: '6px', padding: '4px 10px', fontSize: '11px' }}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${apiData.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    {apiData.status}
                                </span>
                            </dd>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                            <dt className="font-semibold text-gray-900" style={{ fontSize: '14px' }}>Created At</dt>
                            <dd className="text-gray-700 font-medium" style={{ fontSize: '14px' }}>{new Date(apiData.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')}</dd>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:border-l border-gray-100" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '3rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
                            <dt className="font-semibold text-gray-900" style={{ fontSize: '14px' }}>Authentication Mode</dt>
                            <dd style={{ fontSize: '14px' }}>
                                {apiData.auth_mode === 'PUBLIC_READ_ONLY' && <span className="inline-block bg-red-50 text-red-600 font-bold rounded-md uppercase tracking-wide" style={{ padding: '4px 10px', fontSize: '11px' }}>PUBLIC READ-ONLY</span>}
                                {apiData.auth_mode === 'API_KEY_SECRET' && <span className="inline-block bg-green-50 text-green-600 font-bold rounded-md uppercase tracking-wide" style={{ padding: '4px 10px', fontSize: '11px' }}>API Key</span>}
                                {apiData.auth_mode === 'APPLICATION_SESSION' && <span className="inline-block bg-blue-50 text-blue-600 font-bold rounded-md uppercase tracking-wide" style={{ padding: '4px 10px', fontSize: '11px' }}>App Session</span>}
                            </dd>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
                            <dt className="font-semibold text-gray-900" style={{ fontSize: '14px' }}>Attached Routes</dt>
                            <dd className="text-gray-900 font-bold" style={{ fontSize: '14px' }}>{apiData.routes?.length || 0}</dd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRoutes = () => (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Routes Included in this API</h3>
                    <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>Manage the routes that are part of this API package.</p>
                </div>
                <button onClick={() => setIsAttachRouteModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} /> Add Route
                </button>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="ds-table">
                    <thead>
                        <tr>
                            <th>Route</th>
                            <th>Purpose</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apiData.routes?.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500" style={{ fontSize: '14px' }}>No routes attached to this API package.</td>
                            </tr>
                        ) : (
                            apiData.routes.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="font-bold text-gray-900" style={{ fontSize: '14px' }}>{r.name}</div>
                                        <div className="text-gray-500 mt-0.5" style={{ fontSize: '13px' }}>/{r.endpoint_slug}</div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-block bg-gray-100 text-gray-700 font-bold rounded-md uppercase tracking-wide" style={{ padding: '4px 10px', fontSize: '10px' }}>
                                            {r.purpose}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-block font-bold rounded-md uppercase tracking-wide" style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: r.method === 'GET' ? '#dcfce7' : r.method === 'POST' ? '#dbeafe' : '#f3e8ff', color: r.method === 'GET' ? '#166534' : r.method === 'POST' ? '#1e40af' : '#6b21a8' }}>
                                            {r.method}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center text-green-600 font-medium" style={{ gap: '6px', fontSize: '14px' }}>
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div> Active
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end" style={{ gap: '1rem' }}>
                                            <button onClick={() => handleDetachRoute(r.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Detach route from API">
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {/* Pagination Footer */}
                <div className="py-4 px-6 border-t border-gray-100 flex items-center justify-between bg-white">
                    <span className="text-gray-500" style={{ fontSize: '14px' }}>Showing {apiData.routes?.length ? '1' : '0'}–{apiData.routes?.length || 0} of {apiData.routes?.length || 0}</span>
                    <div className="flex items-center" style={{ gap: '0.5rem' }}>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors bg-white">
                            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold" style={{ fontSize: '14px' }}>
                            1
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors bg-white">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCredentials = () => {
        if (apiData.auth_mode === 'PUBLIC_READ_ONLY') {
            return (
                <div className="space-y-8 text-center p-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                        <Key size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Public API</h3>
                    <p className="text-gray-500 mt-1 max-w-md mx-auto" style={{ fontSize: '14px' }}>
                        This API is configured as <strong>Public (Read-Only)</strong>. It does not require any credentials or authentication headers. Command and write routes are strictly prohibited.
                    </p>
                </div>
            );
        }

        if (apiData.auth_mode === 'APPLICATION_SESSION') {
            return (
                <div className="space-y-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Application Access</h3>
                            <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>This API is protected by Application Session authentication.</p>
                        </div>
                    </div>
                    <div className="bg-white p-8 text-center rounded-2xl border border-gray-200 shadow-sm">
                        <Users size={32} className="mx-auto mb-4 text-indigo-400" />
                        <h4 className="text-lg font-bold text-gray-900">Session Based</h4>
                        <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>
                            Access is automatically granted to authenticated users via JWT Bearer tokens. You do not need to manage manual API keys for this mode.
                        </p>
                    </div>
                </div>
            );
        }

        return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">API Credentials</h3>
                    <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>Manage access keys and secrets for this API.</p>
                </div>
                <button onClick={() => {setGeneratedSecret(null); setIsCredModalOpen(true);}} className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} /> Generate API Key
                </button>
            </div>

            {generatedSecret && (
                <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200 shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 text-yellow-600">
                        <Key size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-yellow-900 mb-1">Save Your Secret Key!</h3>
                        <p className="text-[13px] text-yellow-800 mb-4">This is the only time the secret will be displayed. You must provide this in the <code>X-API-Secret</code> header.</p>
                        <div className="bg-white border border-yellow-300 rounded-xl p-3 flex items-center justify-between">
                            <code className="font-mono font-bold text-lg text-gray-900 break-all select-all">{generatedSecret}</code>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="table-container">
                <table className="ds-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>API Key (ID)</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apiData.credentials?.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500" style={{ fontSize: '14px' }}>No credentials generated yet.</td></tr>
                        )}
                        {apiData.credentials?.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6 font-bold text-gray-900" style={{ fontSize: '14px' }}>{c.name}</td>
                                <td className="py-4 px-6 font-mono text-gray-600" style={{ fontSize: '13px' }}>{c.api_key}</td>
                                <td className="py-4 px-6">
                                    <span className={`inline-flex items-center font-medium ${c.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`} style={{ gap: '6px', fontSize: '14px' }}>
                                        <div className={`w-2 h-2 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div> {c.status === 'ACTIVE' ? 'Active' : 'Revoked'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    {c.status === 'ACTIVE' && (
                                        <div className="flex items-center justify-end" style={{ gap: '1rem' }}>
                                            <button onClick={() => handleRevokeCredential(c.id)} className="text-red-500 hover:text-red-700 transition-colors flex items-center font-bold text-sm">
                                                <Trash2 size={16} strokeWidth={2.5} style={{ marginRight: '0.375rem' }} /> Revoke
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isCredModalOpen && !generatedSecret && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Generate API Credential</h3>
                        </div>
                        <form onSubmit={handleCreateCredential} className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Credential Name</label>
                                <input type="text" required value={newCredName} onChange={e=>setNewCredName(e.target.value)} className="w-full border border-gray-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="e.g. Production Server Key" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCredModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">Generate Key</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        );
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
    };

    const renderDocumentation = () => {
        const isPublic = apiData.auth_mode === 'PUBLIC_READ_ONLY';
        const isSession = apiData.auth_mode === 'APPLICATION_SESSION';
        const isApiKey = apiData.auth_mode === 'API_KEY_SECRET';
        
        const baseUrl = window.location.origin + (isPublic ? `/api/v1/public/${apiData.api_slug}` : `/api/v1/routes`);
        
        // 1. Authentication Section
        const renderAuthSection = () => {
            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Key size={20} className="text-gray-400" /> Authentication
                    </h4>
                    
                    {isPublic && (
                        <div>
                            <span className="inline-block bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-green-100">None Required</span>
                            <p className="text-gray-600 text-sm">
                                This is a Public Read-Only API. No login, API key, or secret is required to access the endpoints below.
                            </p>
                        </div>
                    )}

                    {isApiKey && (
                        <div>
                            <span className="inline-block bg-purple-50 text-purple-700 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-purple-100">API Key + Secret</span>
                            <p className="text-gray-600 text-sm mb-4">
                                This API requires an active API Key and Secret. You must generate a credential in the Credentials tab. The secret is displayed only once during generation—store it securely. Revoked credentials will be instantly denied access.
                            </p>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-200">Required Headers</div>
                                <div className="p-4 relative">
                                    <pre className="text-sm font-mono text-gray-800 m-0">
{`X-API-Key: <your-api-key>
X-API-Secret: <your-api-secret>`}</pre>
                                    <button onClick={() => handleCopy(`X-API-Key: <your-api-key>\nX-API-Secret: <your-api-secret>`)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSession && (
                        <div>
                            <span className="inline-block bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-blue-100">Application Session (JWT)</span>
                            <p className="text-gray-600 text-sm mb-4">
                                This API is protected by MyDevice Session Authentication. You must obtain a token by logging into the MyDevice Platform (<code>/api/auth/login</code>) or a specific Workspace Application (<code>/api/applications/&lt;app_id&gt;/auth/login</code>).
                                If you already have an active MyDevice session, no second login is required.
                            </p>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-200">Required Header</div>
                                <div className="p-4 relative">
                                    <pre className="text-sm font-mono text-gray-800 m-0">Authorization: Bearer &lt;jwt_token&gt;</pre>
                                    <button onClick={() => handleCopy(`Authorization: Bearer <jwt_token>`)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        // 2. Quick Start / Base URL
        const renderQuickStart = () => {
            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Start</h4>
                    <p className="text-gray-600 text-sm mb-4">All routes documented below are relative to this Base URL.</p>
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <code className="text-sm font-mono text-gray-900 select-all">{baseUrl}</code>
                        <button onClick={() => handleCopy(baseUrl)} className="p-2 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            );
        };

        // 3. Route Details
        const renderRouteDetails = (route) => {
            const methodColor = route.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
            const endpointUrl = `${baseUrl}/${route.endpoint_slug}`;
            
            // Generate Example Request & Response
            let requestHeaders = '';
            let requestBody = null;
            let responseJson = '';
            let urlParams = '';

            if (isApiKey) {
                requestHeaders = `  -H "X-API-Key: <your-api-key>" \\\n  -H "X-API-Secret: <your-api-secret>"`;
            } else if (isSession) {
                requestHeaders = `  -H "Authorization: Bearer <jwt_token>"`;
            }

            if (route.purpose === 'CURRENT_DATA') {
                urlParams = route.device_scope === 'SINGLE' ? `?limit=100` : `?limit=100&device_id=<optional_device_uuid>`;
                responseJson = JSON.stringify({
                    success: true,
                    data: [
                        {
                            device_id: route.dynamic_schema?.devices?.[0]?.id || "<device_uuid>",
                            recorded_at: new Date().toISOString(),
                            payload: route.dynamic_schema?.data_payload || {}
                        }
                    ]
                }, null, 2);
            } 
            else if (route.purpose === 'HISTORY') {
                urlParams = route.device_scope === 'SINGLE' ? 
                    `?limit=500&page=1&start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z` : 
                    `?limit=500&page=1&start_date=2024-01-01T00:00:00Z&device_id=<optional_device_uuid>`;
                responseJson = JSON.stringify({
                    success: true,
                    data: [
                        {
                            device_id: route.dynamic_schema?.devices?.[0]?.id || "<device_uuid>",
                            recorded_at: new Date().toISOString(),
                            payload: route.dynamic_schema?.data_payload || {}
                        }
                    ],
                    pagination: {
                        total: 1250,
                        page: 1,
                        limit: 500,
                        total_pages: 3
                    }
                }, null, 2);
            } 
            else if (route.purpose === 'DEVICE_STATUS') {
                responseJson = JSON.stringify({
                    success: true,
                    devices: route.dynamic_schema?.devices?.length > 0 ? route.dynamic_schema.devices : [
                        {
                            id: "<uuid>",
                            device_id: "SENSOR-01",
                            name: "Main Thermostat",
                            status: "ONLINE",
                            last_seen: new Date().toISOString()
                        }
                    ]
                }, null, 2);
            }
            else if (route.purpose === 'COMMAND') {
                const isMultiDevice = route.device_scope !== 'SINGLE';
                
                // Construct object with device_id first if needed to maintain structure readability
                let reqObj = {};
                if (isMultiDevice) {
                    reqObj.device_id = "<device_uuid> (required for multiple devices)";
                } else {
                    reqObj.device_id = "<device_uuid> (optional for single device route)";
                }
                
                const exampleCommand = Object.keys(route.dynamic_schema?.commands_schema || {})[0] || "<command_type>";
                const exampleParams = route.dynamic_schema?.commands_schema?.[exampleCommand] || { "parameter_name": "<value>" };

                reqObj.type = exampleCommand;
                reqObj.payload = exampleParams;

                requestBody = JSON.stringify(reqObj, null, 2);

                responseJson = JSON.stringify({
                    success: true,
                    message: "Command sent",
                    command: {
                        id: "<command_uuid>",
                        device_id: route.dynamic_schema?.devices?.[0]?.id || "<device_uuid>",
                        type: exampleCommand,
                        status: "PENDING",
                        created_at: new Date().toISOString()
                    }
                }, null, 2);
            }
            else if (route.purpose === 'REALTIME') {
                const examplePayload = JSON.stringify(route.dynamic_schema?.data_payload || {});
                responseJson = `// Realtime streams are Server-Sent Events (SSE)
// The stream emits standard EventSource formatted data.

event: device_data
data: {"deviceId": "${route.dynamic_schema?.devices?.[0]?.device_id || "<hardware_id>"}", "timestamp": "...", "payload": ${examplePayload}}

event: device_status
data: {"deviceId": "${route.dynamic_schema?.devices?.[0]?.device_id || "<hardware_id>"}", "status": "ONLINE", "lastSeen": "..."}`;
            }

            const curlCmd = `curl -X ${route.method} "${endpointUrl}${urlParams}" \\
${requestHeaders}${requestBody ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'` : ''}`;

            return (
                <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    {/* Header */}
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className={`font-bold px-3 py-1 rounded-md text-[11px] uppercase tracking-wide ${methodColor}`}>
                                {route.method}
                            </span>
                            <code className="text-[15px] font-bold text-gray-900">/{route.endpoint_slug}</code>
                        </div>
                        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {route.purpose}
                        </span>
                    </div>

                    <div className="p-6">
                        <p className="text-gray-600 text-sm mb-6 pb-6 border-b border-gray-100">
                            {route.description || 'No description provided.'}
                        </p>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
                            <div>
                                <h5 className="font-bold text-gray-900 mb-1 text-[12px] uppercase tracking-wider">Authentication Required</h5>
                                <p className="text-gray-600">{isPublic ? 'No' : 'Yes'}</p>
                            </div>
                            <div>
                                <h5 className="font-bold text-gray-900 mb-1 text-[12px] uppercase tracking-wider">Device Scope</h5>
                                <p className="text-gray-600">{route.device_scope === 'GLOBAL' ? 'All Workspace Devices' : 'Selected Devices Only'}</p>
                            </div>
                        </div>

                        {/* Realtime EventSource Note */}
                        {route.purpose === 'REALTIME' && !isPublic && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-8">
                                <h5 className="font-bold text-yellow-800 text-sm mb-1">⚠️ EventSource Authentication Limit</h5>
                                <p className="text-yellow-700 text-xs leading-relaxed">
                                    The native browser <code>new EventSource()</code> API does not support sending custom HTTP headers (like <code>Authorization</code> or <code>X-API-Key</code>).
                                    To connect to this secure stream from a web browser, use a polyfill library such as <code>@microsoft/fetch-event-source</code> which allows custom headers, or connect via a backend proxy.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Request Column */}
                            <div className="space-y-6">
                                <div>
                                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Example Request (cURL)</h5>
                                    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                        <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-400">bash</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto">
                                            <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">{curlCmd}</pre>
                                        </div>
                                        <button onClick={() => handleCopy(curlCmd)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-[#3d3d3d] border border-gray-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Response Column */}
                            <div className="space-y-6">
                                <div>
                                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Response</h5>
                                    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                        <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-400">json / text/event-stream</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto max-h-80">
                                            <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">{responseJson}</pre>
                                        </div>
                                        <button onClick={() => handleCopy(responseJson)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-[#3d3d3d] border border-gray-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Optional: Check Command Status */}
                        {route.purpose === 'COMMAND' && (
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <h4 className="text-[13px] font-bold text-gray-900 mb-4">Check Command Status</h4>
                                <p className="text-xs text-gray-600 mb-6">You can check the status of a command by sending a GET request to this route with the <code className="bg-gray-100 px-1 py-0.5 rounded text-pink-600">command_id</code> returned in the POST response.</p>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div>
                                            <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Example Request (GET)</h5>
                                            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-400">bash</span>
                                                </div>
                                                <div className="p-4 overflow-x-auto">
                                                    <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">
{`curl -X GET "${endpointUrl}?command_id=<command_uuid>" \\
${requestHeaders}`}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Response</h5>
                                            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-400">json</span>
                                                </div>
                                                <div className="p-4 overflow-x-auto max-h-80">
                                                    <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">
{`{
  "success": true,
  "command": {
    "id": "<command_uuid>",
    "device_id": "<device_uuid>",
    "command_type": "<command_type>",
    "status": "COMPLETED",
    "created_at": "2024-01-01T12:00:00.000Z",
    "sent_at": "2024-01-01T12:00:01.000Z",
    "acknowledged_at": "2024-01-01T12:00:02.000Z",
    "completed_at": "2024-01-01T12:00:03.000Z",
    "error_message": null,
    "response_payload": { "result": "success" }
  }
}`}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Optional: Schema Discovery */}
                        {route.purpose === 'COMMAND' && (
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <h4 className="text-[13px] font-bold text-gray-900 mb-4">Command Route Schema Discovery</h4>
                                <p className="text-xs text-gray-600 mb-6">You can fetch the exact schema of supported commands for this route by sending a GET request without a <code className="bg-gray-100 px-1 py-0.5 rounded text-pink-600">command_id</code>.</p>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div>
                                            <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Example Request (GET)</h5>
                                            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-400">bash</span>
                                                </div>
                                                <div className="p-4 overflow-x-auto">
                                                    <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">
{`curl -X GET "${endpointUrl}" \\
${requestHeaders}`}
                                                    </pre>
                                                </div>
                                                <button onClick={() => handleCopy(`curl -X GET "${endpointUrl}" \\\n${requestHeaders}`)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-[#3d3d3d] border border-gray-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Response</h5>
                                            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative">
                                                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                                    <span className="text-xs font-mono text-green-400">json</span>
                                                </div>
                                                <div className="p-4 overflow-x-auto">
                                                    <pre className="text-xs font-mono text-green-300 m-0 leading-relaxed">
{JSON.stringify({
  success: true,
  description: "Command Route Schema Discovery",
  method: "POST",
  required_body: {
    device_id: route.device_scope === 'SINGLE' ? "<optional> Defaults to single device UUID" : "<uuid> Required for multiple devices",
    type: "<string> Required",
    payload: "<object> Command-specific parameters"
  },
  allowed_devices: route.dynamic_schema?.devices?.map(d => d.id) || [],
  allowed_commands: Object.keys(route.dynamic_schema?.commands_schema || {}).length > 0 ? route.dynamic_schema.commands_schema : "ALL_COMMANDS_ALLOWED"
}, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>
                </div>
            );
        };

        // 4. Errors
        const renderErrors = () => {
            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">Error Responses</h4>
                    <p className="text-gray-600 text-sm mb-6">
                        The API runtime uses standard HTTP status codes. Below are errors specifically generated by this API's execution layer.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">400</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Bad Request</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned if a route purpose is unknown, or if a command request is missing `device_id` or `type`.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">401</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Unauthorized</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned for missing authentication, invalid API keys, invalid secrets, or expired JWT tokens.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">403</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Forbidden</h6>
                                <p className="text-xs text-gray-600 mt-1">Token/Key is valid, but access is denied. Reasons include: executing a command on a public route, API package is disabled, missing device permissions, or command type is not explicitly allowed.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">404</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Not Found</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned if the endpoint slug does not exist, the route is disabled, or a targeted device does not exist.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">405</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Method Not Allowed</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned when calling a route with an unsupported HTTP method (e.g., POSTing to a GET route).</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Documentation</h3>
                        <p className="text-gray-500 mt-1" style={{ fontSize: '15px' }}>Technical details, requests, and integration specifications for this API.</p>
                    </div>
                </div>

                {renderAuthSection()}
                {renderQuickStart()}
                
                {apiData.routes?.length > 0 ? (
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">Available Routes</h4>
                        {apiData.routes.map(r => renderRouteDetails(r))}
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center mb-8">
                        <FileText size={32} className="text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-gray-900">No Routes Attached</h4>
                        <p className="text-gray-500 mt-1">Attach routes to this API to generate documentation.</p>
                    </div>
                )}

                {renderErrors()}

            </div>
        );
    };

    return (
        <div className="p-6 mx-auto" style={{ maxWidth: '1200px' }}>
            {/* Breadcrumb */}
            <div className="flex items-center font-medium mb-6" style={{ fontSize: '13px' }}>
                <button onClick={() => navigate(`/workspaces/${workspaceId}/apis?tab=apis`)} className="flex items-center hover:text-blue-700" style={{ color: '#2563eb' }}>
                    <ArrowLeft size={16} className="mr-1" /> APIs
                </button>
                <ChevronRight size={14} className="mx-2 text-gray-400" />
                <span className="text-gray-500">{apiData.name}</span>
            </div>

            {/* Header Block */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-start" style={{ gap: '1.25rem' }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: '#f3e8ff', border: '1px solid #e9d5ff' }}>
                        <Package size={32} strokeWidth={1.5} style={{ color: '#9333ea' }} />
                    </div>
                    <div>
                        <div className="flex items-center mb-1" style={{ gap: '0.75rem' }}>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{apiData.name}</h1>
                            <span className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${apiData.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`} style={{ gap: '6px', padding: '4px 10px', fontSize: '11px' }}>
                                <div className={`w-1.5 h-1.5 rounded-full ${apiData.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                {apiData.status}
                            </span>
                        </div>
                        <p className="text-gray-500 font-medium" style={{ fontSize: '14px' }}>API Package Details</p>
                        <p className="text-gray-600 mt-1" style={{ fontSize: '15px' }}>{apiData.description || 'testing'}</p>
                    </div>
                </div>

                <div className="flex items-center" style={{ gap: '0.5rem' }}>
                    <button onClick={() => setIsEditApiModalOpen(true)} className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                        <Edit2 size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} /> Edit
                    </button>
                    <button onClick={handleDeleteApi} className="flex items-center px-4 py-2 bg-white border border-gray-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm">
                        <Trash2 size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} /> Delete
                    </button>
                    <button className="flex items-center px-2 py-2 bg-white border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                        <MoreHorizontal size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-8 border-b border-gray-200">
                <nav className="-mb-px flex space-x-2">
                    {[
                        { id: 'overview', label: 'Overview', icon: Home },
                        { id: 'routes', label: 'Routes', icon: Share2 },
                        { id: 'credentials', label: apiData.auth_mode === 'API_KEY_SECRET' ? 'Credentials' : 'Access', icon: Key },
                        { id: 'documentation', label: 'Documentation', icon: BookOpen }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center px-6 py-3.5 border-b-2 font-bold transition-colors
                                    ${isActive 
                                        ? 'border-blue-600 text-blue-600 rounded-t-lg' 
                                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg'
                                    }
                                `}
                                style={{ fontSize: '14px', backgroundColor: isActive ? '#eff6ff' : 'transparent' }}
                            >
                                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} strokeWidth={2.5} style={{ marginRight: '0.625rem' }} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'routes' && renderRoutes()}
                {activeTab === 'credentials' && renderCredentials()}
                {activeTab === 'documentation' && renderDocumentation()}
            </div>

            {isEditApiModalOpen && (
                <EditApiModal 
                    workspaceId={workspaceId} 
                    api={apiData} 
                    onClose={() => setIsEditApiModalOpen(false)} 
                    onSuccess={() => { setIsEditApiModalOpen(false); loadApiData(); }} 
                />
            )}

            {isAttachRouteModalOpen && (
                <AttachRouteModal 
                    workspaceId={workspaceId} 
                    api={apiData} 
                    onClose={() => setIsAttachRouteModalOpen(false)} 
                    onSuccess={() => { setIsAttachRouteModalOpen(false); loadApiData(); }} 
                />
            )}

            <ConfirmDialog 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
            />
        </div>
    );
};

export default WorkspaceApiDetails;
