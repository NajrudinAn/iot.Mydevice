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
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Workspace APIs</h2>
                    <p className="text-[15px] text-gray-500 mt-1 font-medium">Manage and configure your custom API packages.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                    + Create API
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search APIs by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-gray-50/50 border border-gray-200 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-[15px] text-gray-900 transition-all outline-none"
                    />
                </div>
                <div className="shrink-0 relative">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-11 px-4 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-[15px] font-medium text-gray-700 outline-none transition-all cursor-pointer min-w-[150px] appearance-none" 
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 0.875rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}
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
                <div className="flex flex-col gap-4">
                    {filteredApis.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No APIs match your search.</div>
                    ) : (
                        filteredApis.map((api) => (
                            <div
                                key={api.id}
                                onClick={() => onSelectApi(api.id)}
                                className={`bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group ${api.status !== 'ACTIVE' ? 'opacity-70' : ''}`}
                            >
                                {/* Top Half */}
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                            <Package size={28} strokeWidth={1.5} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-[18px] font-bold text-gray-900">{api.name}</h3>
                                                <span className={`badge gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${api.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${api.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                    {api.status}
                                                </span>
                                            </div>
                                            <p className="text-[15px] text-gray-500 mt-0.5">{api.description || 'No description provided.'}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 p-1 text-gray-400 hover:bg-gray-50 rounded-lg">
                                        <MoreHorizontal size={20} />
                                    </div>
                                </div>
                                
                                {/* Bottom Half */}
                                <div className="flex items-end justify-between mt-8" style={{ paddingLeft: '4.5rem' }}>
                                    <div className="flex items-center">
                                        <div className="pr-8">
                                            <p className="text-xl font-bold text-gray-900 leading-none mb-1">{api.route_count}</p>
                                            <p className="text-[13px] text-gray-500 font-medium">Routes</p>
                                        </div>
                                        <div className="w-px h-10 bg-gray-200"></div>
                                        <div className="px-8">
                                            <p className="text-xl font-bold text-gray-900 leading-none mb-1">{api.credential_count}</p>
                                            <p className="text-[13px] text-gray-500 font-medium">API Keys</p>
                                        </div>
                                        <div className="w-px h-10 bg-gray-200"></div>
                                        <div className="pl-8">
                                            <p className="text-xl font-bold text-gray-900 leading-none mb-1">{api.user_count}</p>
                                            <p className="text-[13px] text-gray-500 font-medium">Users</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                                        <span className="text-sm font-semibold text-gray-800">Manage</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5 text-gray-600"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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
