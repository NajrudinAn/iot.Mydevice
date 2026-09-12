import React, { useState, useEffect } from 'react';
import { createApi, getRoutes } from '../../api/apiManagement';
import { X, Key, Package, Layers, Command, Check } from 'lucide-react';
import Modal from '../ui/Modal';

const CreateApiModal = ({ workspaceId, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [authMode, setAuthMode] = useState('API_KEY_SECRET');
    const [selectedRoutes, setSelectedRoutes] = useState([]);
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getRoutes(workspaceId).then(res => setAvailableRoutes(res.data.routes || []));
    }, [workspaceId]);

    useEffect(() => {
        if (authMode === 'PUBLIC_READ_ONLY') {
            const validSelected = selectedRoutes.filter(id => {
                const route = availableRoutes.find(r => r.id === id);
                return route && route.purpose !== 'COMMAND' && route.method === 'GET';
            });
            if (validSelected.length !== selectedRoutes.length) {
                setSelectedRoutes(validSelected);
            }
        }
    }, [authMode, availableRoutes, selectedRoutes]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoutes.length === 0) {
            return alert('Please select at least one route.');
        }

        setLoading(true);
        try {
            const res = await createApi(workspaceId, {
                name,
                description,
                auth_mode: authMode,
                route_ids: selectedRoutes
            });
            onSuccess(res.data.api);
        } catch (error) {
            alert('Failed to create API');
        } finally {
            setLoading(false);
        }
    };

    const toggleRoute = (routeId) => {
        if (selectedRoutes.includes(routeId)) {
            setSelectedRoutes(selectedRoutes.filter(id => id !== routeId));
        } else {
            setSelectedRoutes([...selectedRoutes, routeId]);
        }
    };

    const handleClose = () => {
        const isDirty = name !== '' || description !== '' || selectedRoutes.length > 0;
        if (isDirty) {
            if (window.confirm('Discard unsaved changes?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const modalTitle = (
        <div className="flex items-start gap-4 -mt-1 -ml-1">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0 flex items-center justify-center">
                <Package size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 tracking-tight leading-none mb-1.5">Create New API Package</span>
                <span className="text-sm font-medium text-gray-500">Group routes to issue API credentials.</span>
            </div>
        </div>
    );

    const modalFooter = (
        <div className="flex justify-end w-full">
            <div className="flex gap-3">
                <button type="button" onClick={handleClose} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">Cancel</button>
                <button type="submit" form="create-api-form" disabled={loading || !name || selectedRoutes.length === 0} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">{loading ? 'Creating...' : 'Create API'}</button>
            </div>
        </div>
    );

    return (
        <Modal 
            isOpen={true} 
            onClose={handleClose} 
            title={modalTitle}
            className="max-w-2xl w-full !p-0 !overflow-hidden bg-white"
            footer={modalFooter}
        >
            <div className="p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <form id="create-api-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                                <Layers size={18} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-900">Basic Information</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Give your API package a clear name and description.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 mt-4" style={{ gap: '20px' }}>
                            <div>
                                <label className="block text-[13px] font-bold text-gray-700 mb-1.5" style={{ color: '#374151' }}>API Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium placeholder-gray-400"
                                    placeholder="e.g. Mobile App API v1"
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Description (Optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium placeholder-gray-400"
                                    placeholder="Briefly describe this API package..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg shrink-0">
                                <Key size={18} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-900">Authentication Mode</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Define how clients authenticate against this API.</p>
                            </div>
                        </div>
                        <div className="flex flex-col" style={{ gap: '8px', marginBottom: '8px' }}>
                            <label className="block border-2 p-4 rounded-xl cursor-pointer transition-colors"
                                style={{ 
                                    borderColor: authMode === 'PUBLIC_READ_ONLY' ? '#3b82f6' : '#f3f4f6', 
                                    backgroundColor: authMode === 'PUBLIC_READ_ONLY' ? '#eff6ff' : '#ffffff'
                                }}>
                                <div className="flex items-center">
                                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                         style={{ 
                                             borderColor: authMode === 'PUBLIC_READ_ONLY' ? '#3b82f6' : '#d1d5db', 
                                             backgroundColor: authMode === 'PUBLIC_READ_ONLY' ? '#3b82f6' : 'transparent',
                                             marginRight: '12px'
                                         }}>
                                        {authMode === 'PUBLIC_READ_ONLY' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-sm font-bold" style={{ color: authMode === 'PUBLIC_READ_ONLY' ? '#1e3a8a' : '#111827' }}>Public (Read-Only)</span>
                                        <span className="block text-[13px] mt-0.5" style={{ color: '#6b7280' }}>No authentication required. Cannot execute commands.</span>
                                    </div>
                                </div>
                            </label>

                            <label className="block border-2 p-4 rounded-xl cursor-pointer transition-colors"
                                style={{ 
                                    borderColor: authMode === 'APPLICATION_SESSION' ? '#3b82f6' : '#f3f4f6', 
                                    backgroundColor: authMode === 'APPLICATION_SESSION' ? '#eff6ff' : '#ffffff'
                                }}>
                                <div className="flex items-center">
                                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                         style={{ 
                                             borderColor: authMode === 'APPLICATION_SESSION' ? '#3b82f6' : '#d1d5db', 
                                             backgroundColor: authMode === 'APPLICATION_SESSION' ? '#3b82f6' : 'transparent',
                                             marginRight: '12px'
                                         }}>
                                        {authMode === 'APPLICATION_SESSION' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-sm font-bold" style={{ color: authMode === 'APPLICATION_SESSION' ? '#1e3a8a' : '#111827' }}>Application Session</span>
                                        <span className="block text-[13px] mt-0.5" style={{ color: '#6b7280' }}>Requires an authenticated user session (cookies/tokens).</span>
                                    </div>
                                </div>
                            </label>

                            <label className="block border-2 p-4 rounded-xl cursor-pointer transition-colors"
                                style={{ 
                                    borderColor: authMode === 'API_KEY_SECRET' ? '#3b82f6' : '#f3f4f6', 
                                    backgroundColor: authMode === 'API_KEY_SECRET' ? '#eff6ff' : '#ffffff'
                                }}>
                                <div className="flex items-center">
                                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                         style={{ 
                                             borderColor: authMode === 'API_KEY_SECRET' ? '#3b82f6' : '#d1d5db', 
                                             backgroundColor: authMode === 'API_KEY_SECRET' ? '#3b82f6' : 'transparent',
                                             marginRight: '12px'
                                         }}>
                                        {authMode === 'API_KEY_SECRET' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <span className="block text-sm font-bold" style={{ color: authMode === 'API_KEY_SECRET' ? '#1e3a8a' : '#111827' }}>API Key + Secret</span>
                                        <span className="block text-[13px] mt-0.5" style={{ color: '#6b7280' }}>Requires programmatic API credentials in headers.</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="p-2 bg-green-50 text-green-500 rounded-lg shrink-0">
                                <Command size={18} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-gray-900">Include Routes</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Select the reusable routes to expose in this API package.</p>
                            </div>
                        </div>
                        {availableRoutes.length === 0 ? (
                            <div className="text-[13px] font-medium text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
                                No routes available. Please create reusable routes first.
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-gray-100 shadow-sm bg-gray-50/30 custom-scrollbar">
                                {availableRoutes.filter(route => {
                                    if (authMode === 'PUBLIC_READ_ONLY') {
                                        return route.purpose !== 'COMMAND' && route.method === 'GET';
                                    }
                                    return true;
                                }).length === 0 ? (
                                    <div className="p-6 text-[13px] font-medium text-gray-500 text-center">
                                        No routes available for the selected authentication mode.<br/>
                                        <span className="text-xs mt-1 block">Command/Write routes cannot be public.</span>
                                    </div>
                                ) : availableRoutes.filter(route => {
                                    if (authMode === 'PUBLIC_READ_ONLY') {
                                        return route.purpose !== 'COMMAND' && route.method === 'GET';
                                    }
                                    return true;
                                }).map(route => (
                                    <label key={route.id} className="cursor-pointer transition-colors group hover:bg-white" style={{ display: 'flex', alignItems: 'center', padding: '14px', backgroundColor: selectedRoutes.includes(route.id) ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f3f4f6' }}>
                                        <div className="flex-shrink-0 pt-0.5">
                                            <div className="w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 transition-colors"
                                                 style={{
                                                     borderColor: selectedRoutes.includes(route.id) ? '#3b82f6' : '#d1d5db',
                                                     backgroundColor: selectedRoutes.includes(route.id) ? '#3b82f6' : '#ffffff',
                                                     marginRight: '12px'
                                                 }}>
                                                {selectedRoutes.includes(route.id) && <Check size={14} color="#ffffff" strokeWidth={3} />}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <span className="block text-[14px] font-bold" style={{ color: selectedRoutes.includes(route.id) ? '#1e3a8a' : '#111827' }}>{route.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                                                      style={{ 
                                                          backgroundColor: route.method === 'GET' ? '#dcfce7' : '#dbeafe', 
                                                          color: route.method === 'GET' ? '#15803d' : '#1d4ed8' 
                                                      }}>
                                                    {route.method}
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono">/{route.endpoint_slug}</span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                                                {route.purpose}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CreateApiModal;
