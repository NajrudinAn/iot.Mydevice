import React, { useState, useEffect } from 'react';
import { createApi, getRoutes } from '../../api/apiManagement';
import { X, Key } from 'lucide-react';
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

    const modalFooter = (
        <div className="flex w-full justify-end items-center">
            <div className="flex space-x-3">
                <button type="button" onClick={handleClose} className="bg-white py-2 px-5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" form="create-api-form" disabled={loading || !name || selectedRoutes.length === 0} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {loading ? 'Creating...' : 'Create API'}
                </button>
            </div>
        </div>
    );

    return (
        <Modal 
            isOpen={true} 
            onClose={handleClose} 
            title="Create New API Package"
            className="max-w-2xl w-full"
            footer={modalFooter}
        >
            <p className="text-sm text-gray-500 mb-6">Group routes to issue API credentials.</p>
            <form id="create-api-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">API Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="e.g. Mobile App API v1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                rows="2"
                                placeholder="Describe the purpose of this API package..."
                            />
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Authentication</h4>
                            <div className="space-y-3">
                                <label className={`block border p-4 rounded-lg cursor-pointer transition-colors ${authMode === 'PUBLIC_READ_ONLY' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50 bg-white'}`}>
                                    <div className="flex items-center">
                                        <input type="radio" name="auth_mode" value="PUBLIC_READ_ONLY" checked={authMode === 'PUBLIC_READ_ONLY'} onChange={() => setAuthMode('PUBLIC_READ_ONLY')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                        <div className="ml-3">
                                            <span className="block text-sm font-medium text-gray-900">Public (Read-Only)</span>
                                            <span className="block text-sm text-gray-500 mt-1">No authentication required. Cannot execute commands.</span>
                                        </div>
                                    </div>
                                </label>

                                <label className={`block border p-4 rounded-lg cursor-pointer transition-colors ${authMode === 'APPLICATION_SESSION' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50 bg-white'}`}>
                                    <div className="flex items-center">
                                        <input type="radio" name="auth_mode" value="APPLICATION_SESSION" checked={authMode === 'APPLICATION_SESSION'} onChange={() => setAuthMode('APPLICATION_SESSION')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                        <div className="ml-3">
                                            <span className="block text-sm font-medium text-gray-900">Application Session</span>
                                            <span className="block text-sm text-gray-500 mt-1">Requires an authenticated user session.</span>
                                        </div>
                                    </div>
                                </label>

                                <label className={`block border p-4 rounded-lg cursor-pointer transition-colors ${authMode === 'API_KEY_SECRET' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50 bg-white'}`}>
                                    <div className="flex items-center">
                                        <input type="radio" name="auth_mode" value="API_KEY_SECRET" checked={authMode === 'API_KEY_SECRET'} onChange={() => setAuthMode('API_KEY_SECRET')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                        <div className="ml-3">
                                            <span className="block text-sm font-medium text-gray-900">API Key + Secret</span>
                                            <span className="block text-sm text-gray-500 mt-1">Requires programmatic API credentials.</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Include Routes</label>
                            {availableRoutes.length === 0 ? (
                                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    No routes available. Please create reusable routes first.
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100 shadow-sm bg-white">
                                    {availableRoutes.filter(route => {
                                        if (authMode === 'PUBLIC_READ_ONLY') {
                                            return route.purpose !== 'COMMAND' && route.method === 'GET';
                                        }
                                        return true;
                                    }).length === 0 ? (
                                        <div className="p-4 text-sm text-gray-500 italic text-center">
                                            No routes available for the selected authentication mode. (Command/Write routes cannot be public).
                                        </div>
                                    ) : availableRoutes.filter(route => {
                                        if (authMode === 'PUBLIC_READ_ONLY') {
                                            return route.purpose !== 'COMMAND' && route.method === 'GET';
                                        }
                                        return true;
                                    }).map(route => (
                                        <label key={route.id} className="flex items-start p-3 hover:bg-indigo-50 cursor-pointer transition-colors group">
                                            <div className="flex-shrink-0 pt-0.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRoutes.includes(route.id)}
                                                    onChange={() => toggleRoute(route.id)}
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <span className="block text-sm font-medium text-gray-900 group-hover:text-indigo-900">{route.name}</span>
                                                <span className="block text-xs text-gray-500 font-mono mt-1 bg-gray-100 group-hover:bg-white inline-block px-1.5 py-0.5 rounded"><span className="text-indigo-600 font-bold">{route.method}</span> /{route.endpoint_slug}</span>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    {route.purpose}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
        </Modal>
    );
};

export default CreateApiModal;
