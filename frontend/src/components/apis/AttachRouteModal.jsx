import React, { useState, useEffect } from 'react';
import { getRoutes, updateApi } from '../../api/apiManagement';
import Modal from '../ui/Modal';

const AttachRouteModal = ({ workspaceId, api, onClose, onSuccess }) => {
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [selectedRoutes, setSelectedRoutes] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getRoutes(workspaceId).then(res => {
            const allRoutes = res.data.routes || [];
            const attachedRouteIds = new Set((api.routes || []).map(r => r.id));
            
            let attachable = allRoutes.filter(r => !attachedRouteIds.has(r.id));
            
            if (api.auth_mode === 'PUBLIC_READ_ONLY') {
                attachable = attachable.filter(r => r.purpose !== 'COMMAND' && r.method === 'GET');
            }
            
            setAvailableRoutes(attachable);
        });
    }, [workspaceId, api]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedRoutes.length === 0) return alert('Please select at least one route.');

        setLoading(true);
        try {
            const newRouteIds = [...(api.routes || []).map(r => r.id), ...selectedRoutes];
            const res = await updateApi(workspaceId, api.id, {
                route_ids: newRouteIds
            });
            onSuccess(res.data.api);
        } catch (error) {
            alert('Failed to attach routes');
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

    const modalFooter = (
        <div className="flex w-full justify-end items-center space-x-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
            </button>
            <button type="submit" form="attach-route-form" disabled={loading || selectedRoutes.length === 0} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Attaching...' : 'Attach Routes'}
            </button>
        </div>
    );

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title="Attach Existing Routes"
            className="max-w-2xl w-full"
            footer={modalFooter}
        >
            <p className="text-sm text-gray-500 mb-6">Select reusable routes to attach to this API package.</p>
            <form id="attach-route-form" onSubmit={handleSubmit}>
                {availableRoutes.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                        {api.auth_mode === 'PUBLIC_READ_ONLY' 
                            ? 'No available read-only routes to attach.'
                            : 'No available routes to attach. Create new routes in the Routes tab.'}
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100 shadow-sm bg-white">
                        {availableRoutes.map(route => (
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
            </form>
        </Modal>
    );
};

export default AttachRouteModal;
