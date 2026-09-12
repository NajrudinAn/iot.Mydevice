import React, { useState, useEffect } from 'react';
import { getApis, deleteApi } from '../../api/apiManagement';
import CreateApiModal from './CreateApiModal';
import { Trash2, ChevronRight, Server, Package, Search, MoreHorizontal, ChevronLeft } from 'lucide-react';

const ApisTab = ({ workspaceId, onSelectApi }) => {
    const [apis, setApis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    const loadApis = async () => {
        try {
            setLoading(true);
            const res = await getApis(workspaceId);
            setApis(res.data.apis || []);
        } catch (error) {
            console.error('Failed to load APIs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApis();
    }, [workspaceId]);

    const handleDelete = async (e, apiId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this API? All credentials will be invalidated.')) return;
        try {
            await deleteApi(workspaceId, apiId);
            loadApis();
        } catch (error) {
            alert('Failed to delete API');
        }
    };

    // Filter logic
    const filteredApis = apis.filter(api => {
        const matchesSearch = api.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (api.description && api.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'All Status' || api.status === statusFilter.toUpperCase();
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="w-full">
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 250px' }}>
                    <div style={{ padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#8b5cf6', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>Workspace APIs</h2>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>Manage and configure your custom API packages.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                    + Create API
                </button>
            </div>

            {/* Search and Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '0' }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                    <input
                        type="text"
                        placeholder="Search APIs by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', height: '40px', paddingLeft: '44px', paddingRight: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', fontSize: '14px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>
                <div style={{ flexShrink: 0 }}>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ height: '40px', padding: '0 36px 0 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, color: '#475569', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', minWidth: '130px' }}
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center py-12 text-gray-500">Loading APIs...</div>
            ) : apis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border border-gray-100 bg-gray-50/50 rounded-2xl max-w-2xl mx-auto">
                    <div className="bg-blue-50 p-4 rounded-2xl mb-5">
                        <Server className="h-10 w-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No APIs created yet</h3>
                    <p className="text-gray-500 text-center max-w-md mb-8 text-[15px]">
                        Create an API package to bundle your routes together and generate access credentials.
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                        + Create API
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {filteredApis.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>No APIs match your search.</div>
                    ) : (
                        filteredApis.map((api) => (
                            <div
                                key={api.id}
                                onClick={() => onSelectApi(api.id)}
                                style={{
                                    background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', 
                                    boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)', cursor: 'pointer', transition: 'all 0.2s',
                                    opacity: api.status === 'ACTIVE' ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: '20px'
                                }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(15,23,42,0.05)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(15,23,42,0.03)'; }}
                            >
                                {/* Top Half */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Package size={24} style={{ color: '#8b5cf6' }} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{api.name}</h3>
                                                <div style={{ 
                                                    display: 'inline-flex', alignItems: 'center', 
                                                    background: api.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9', 
                                                    color: api.status === 'ACTIVE' ? '#059669' : '#64748b', 
                                                    padding: '4px 12px', borderRadius: '9999px', 
                                                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                                                    letterSpacing: '0.05em', border: api.status === 'ACTIVE' ? '1px solid #d1fae5' : '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', background: api.status === 'ACTIVE' ? '#10b981' : '#94a3b8' }}></div>
                                                    {api.status}
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{api.description || 'No description provided.'}</p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                                        <MoreHorizontal size={20} />
                                    </div>
                                </div>
                                
                                {/* Bottom Half */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ paddingRight: '20px' }}>
                                            <p style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{api.route_count}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Routes</p>
                                        </div>
                                        <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }}></div>
                                        <div style={{ padding: '0 20px' }}>
                                            <p style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{api.credential_count}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>API Keys</p>
                                        </div>
                                        <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }}></div>
                                        <div style={{ paddingLeft: '20px' }}>
                                            <p style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{api.user_count}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Users</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            {filteredApis.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                    <span className="text-[14px] text-gray-500 font-medium">
                        Showing 1-{filteredApis.length} of {filteredApis.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 disabled:opacity-50" disabled>
                            <ChevronLeft size={16} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-semibold">
                            1
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 disabled:opacity-50" disabled>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <CreateApiModal
                    workspaceId={workspaceId}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={(newApi) => {
                        setIsCreateModalOpen(false);
                        loadApis();
                    }}
                />
            )}
        </div>
    );
};

export default ApisTab;
