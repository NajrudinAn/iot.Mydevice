import React, { useState, useEffect } from 'react';
import { getRoutes, deleteRoute } from '../../api/apiManagement';
import CreateRouteModal from './CreateRouteModal';
import { Trash2, Pencil, Copy, Share2, ShieldCheck, Clock, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const RoutesTab = ({ workspaceId }) => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [routeToEdit, setRouteToEdit] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [methodFilter, setMethodFilter] = useState('All Methods');
    const [statusFilter, setStatusFilter] = useState('All Status');

    const loadRoutes = async () => {
        try {
            setLoading(true);
            const res = await getRoutes(workspaceId);
            setRoutes(res.data.routes || []);
        } catch (error) {
            console.error('Failed to load routes', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoutes();
    }, [workspaceId]);

    const handleDelete = async (routeId) => {
        if (!window.confirm('Are you sure you want to delete this Route? APIs using it will be affected.')) return;
        try {
            await deleteRoute(workspaceId, routeId);
            loadRoutes();
        } catch (error) {
            alert('Failed to delete route');
        }
    };

    const activeRoutesCount = routes.filter(r => r.is_active).length;
    const totalApiUsage = routes.reduce((acc, r) => acc + parseInt(r.usage_count || 0), 0);
    const mostUsedRoute = routes.length > 0 ? [...routes].sort((a, b) => b.usage_count - a.usage_count)[0] : null;

    const filteredRoutes = routes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.endpoint_slug || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMethod = methodFilter === 'All Methods' || r.method === methodFilter;
        const matchesStatus = statusFilter === 'All Status' || (statusFilter === 'Active' ? r.is_active : !r.is_active);
        return matchesSearch && matchesMethod && matchesStatus;
    });

    return (
        <div className="w-full">
            {/* Header Area */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyItems: 'space-between', gap: '16px', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #f3f4f6', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 250px' }}>
                    <div style={{ padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#3b82f6', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Share2 size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>Reusable Routes</h2>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>Create and manage reusable API routes that can be grouped into APIs.</p>
                    </div>
                </div>
                <button
                    onClick={() => { setRouteToEdit(null); setIsCreateModalOpen(true); }}
                    style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                    + Create Route
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)' }}>
                    <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '12px', color: '#3b82f6', flexShrink: 0 }}>
                        <Share2 size={20} />
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Total Routes</p>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{routes.length}</h3>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>Reusable endpoints</p>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)' }}>
                    <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '12px', color: '#10b981', flexShrink: 0 }}>
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Active Routes</p>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{activeRoutesCount}</h3>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>Accessible and ready</p>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)' }}>
                    <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '12px', color: '#d97706', flexShrink: 0 }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Total API Usage</p>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{totalApiUsage}</h3>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>APIs attached</p>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)' }}>
                    <div style={{ padding: '10px', background: '#f5f3ff', borderRadius: '12px', color: '#8b5cf6', flexShrink: 0 }}>
                        <FileText size={20} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Most Used Route</p>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mostUsedRoute?.name || 'None'}</h3>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>{mostUsedRoute?.usage_count || 0} APIs</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '0' }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                    <input
                        type="text"
                        placeholder="Search routes by name, path or purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', height: '40px', paddingLeft: '44px', paddingRight: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', fontSize: '14px', color: '#0f172a', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
                    <select 
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        style={{ height: '40px', padding: '0 36px 0 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, color: '#475569', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', minWidth: '130px' }}
                    >
                        <option>All Methods</option>
                        <option>GET</option>
                        <option>POST</option>
                    </select>
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

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#fafaf9' }}>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Route</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Method</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Purpose</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Usage</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRoutes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                        No routes found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRoutes.map((route, index) => (
                                    <tr key={route.id} style={{ borderBottom: index === filteredRoutes.length - 1 ? 'none' : '1px solid #f1f5f9', opacity: route.is_active ? 1 : 0.6, transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{route.name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>/{route.endpoint_slug}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <div style={{ 
                                                display: 'inline-flex', alignItems: 'center', 
                                                background: route.method === 'GET' ? '#ecfdf5' : '#eff6ff', 
                                                color: route.method === 'GET' ? '#059669' : '#2563eb', 
                                                padding: '4px 12px', borderRadius: '9999px', 
                                                fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                                                letterSpacing: '0.05em', border: route.method === 'GET' ? '1px solid #d1fae5' : '1px solid #dbeafe'
                                            }}>
                                                {route.method}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{route.purpose}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={route.description}>
                                                {route.description || 'No description provided'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{route.usage_count} APIs</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{(route.calls_count || 0).toLocaleString()} calls</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                                            <div style={{ 
                                                display: 'inline-flex', alignItems: 'center', 
                                                background: route.is_active ? '#ecfdf5' : '#f1f5f9', 
                                                color: route.is_active ? '#059669' : '#64748b', 
                                                padding: '4px 12px', borderRadius: '9999px', 
                                                fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                                                letterSpacing: '0.05em', border: route.is_active ? '1px solid #d1fae5' : '1px solid #e2e8f0'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', background: route.is_active ? '#10b981' : '#94a3b8' }}></div>
                                                {route.is_active ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button onClick={() => { setRouteToEdit(route); setIsCreateModalOpen(true); }} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }} onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }} title="Edit">
                                                    <Pencil size={16} strokeWidth={2.5} />
                                                </button>
                                                <button style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }} onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }} title="Copy">
                                                    <Copy size={16} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => handleDelete(route.id)} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }} onMouseOut={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'transparent'; }} title="Delete">
                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                {filteredRoutes.length > 0 && (
                    <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'rgba(249, 250, 251, 0.3)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                            Showing <span style={{ fontWeight: 700, color: '#111827' }}>1-{filteredRoutes.length}</span> of <span style={{ fontWeight: 700, color: '#111827' }}>{filteredRoutes.length}</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button disabled style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#6b7280', fontWeight: 700, fontSize: '13px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', opacity: 0.5, cursor: 'not-allowed' }}>
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                            <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: '#fff', fontWeight: 700, borderRadius: '8px', fontSize: '13px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: 'none' }}>
                                1
                            </button>
                            <button disabled style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#6b7280', fontWeight: 700, fontSize: '13px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', opacity: 0.5, cursor: 'not-allowed' }}>
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <CreateRouteModal
                    workspaceId={workspaceId}
                    existingRoute={routeToEdit}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        loadRoutes();
                    }}
                />
            )}
        </div>
    );
};

export default RoutesTab;
