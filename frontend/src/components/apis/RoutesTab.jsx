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

    const filteredRoutes = routes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.endpoint_slug || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="w-full">
            {/* Header Area */}
            <div className="flex-between mb-8 gap-4 bg-slate-50 p-6 rounded-xl border border-gray-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl text-blue-500 shadow-sm flex-center">
                        <Share2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Reusable Routes</h2>
                        <p className="text-sm text-gray-500 mt-1">Create and manage reusable API routes that can be grouped into APIs.</p>
                    </div>
                </div>
                <button
                    onClick={() => { setRouteToEdit(null); setIsCreateModalOpen(true); }}
                    className="ds-btn shrink-0"
                >
                    + Create Route
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
                    <div className="p-2.5 bg-blue-50 rounded-lg text-blue-500 shrink-0">
                        <Share2 size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Total Routes</p>
                        <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1">{routes.length}</h3>
                        <p className="text-xs text-gray-400">Reusable endpoints</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
                    <div className="p-2.5 bg-green-50 rounded-lg text-green-500 shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Active Routes</p>
                        <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1">{activeRoutesCount}</h3>
                        <p className="text-xs text-gray-400">Accessible and ready</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
                    <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700 shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Total API Usage</p>
                        <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1">{totalApiUsage}</h3>
                        <p className="text-xs text-gray-400">APIs attached</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all">
                    <div className="p-2.5 bg-purple-light rounded-lg text-purple shrink-0">
                        <FileText size={20} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 mb-1">Most Used Route</p>
                        <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1 truncate">{mostUsedRoute?.name || 'None'}</h3>
                        <p className="text-xs text-gray-400">{mostUsedRoute?.usage_count || 0} APIs</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search routes by name, path or purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm text-gray-900 shadow-sm transition-all outline-none"
                    />
                </div>
                <div className="flex gap-3 shrink-0">
                    <select className="h-11 px-4 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-medium text-gray-700 outline-none shadow-sm transition-all cursor-pointer min-w-[140px] appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 0.875rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}>
                        <option>All Methods</option>
                        <option>GET</option>
                        <option>POST</option>
                    </select>
                    <select className="h-11 px-4 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-medium text-gray-700 outline-none shadow-sm transition-all cursor-pointer min-w-[140px] appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 0.875rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}>
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse ds-table">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Route</th>
                                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Purpose</th>
                                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Usage</th>
                                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRoutes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No routes found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRoutes.map((route) => (
                                    <tr key={route.id} className={`hover:bg-slate-50/50 transition-colors ${!route.is_active ? 'opacity-60' : ''}`}>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="font-bold text-gray-900">{route.name}</div>
                                            <div className="text-xs text-gray-400 mt-0.5 font-mono">/{route.endpoint_slug}</div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <span className={`badge ${route.method === 'GET' ? 'badge-success' : 'badge-primary'}`}>
                                                {route.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="text-[13px] font-semibold text-gray-700">{route.purpose}</div>
                                            <div className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate" title={route.description}>
                                                {route.description || 'No description provided'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="text-[13px] font-bold text-gray-900">{route.usage_count} APIs</div>
                                            <div className="text-xs text-gray-400 mt-0.5">{(route.calls_count || 0).toLocaleString()} calls</div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <span className={`badge gap-1.5 ${route.is_active ? 'badge-success' : 'badge-neutral'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${route.is_active ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                {route.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-right text-gray-400">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setRouteToEdit(route); setIsCreateModalOpen(true); }} className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                    <Pencil size={16} strokeWidth={2.5} />
                                                </button>
                                                <button className="p-1.5 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Copy">
                                                    <Copy size={16} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => handleDelete(route.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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
                    <div className="px-6 py-3.5 border-t border-gray-200 flex items-center justify-between bg-gray-50/30 rounded-b-xl">
                        <span className="text-[13px] text-gray-500 font-medium">
                            Showing <span className="font-bold text-gray-900">1-{filteredRoutes.length}</span> of <span className="font-bold text-gray-900">{filteredRoutes.length}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 font-bold text-[13px] shadow-sm hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                            <button className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white font-bold rounded-lg text-[13px] shadow-sm">
                                1
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 font-bold text-[13px] shadow-sm hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
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
