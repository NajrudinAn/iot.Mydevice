import React, { useState, useEffect } from 'react';
import { updateApi } from '../../api/apiManagement';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

const EditApiModal = ({ workspaceId, api, onClose, onSuccess }) => {
    const [name, setName] = useState(api.name || '');
    const [description, setDescription] = useState(api.description || '');
    const [authMode, setAuthMode] = useState(api.auth_mode || 'API_KEY_SECRET');
    const [status, setStatus] = useState(api.status || 'ACTIVE');
    const [loading, setLoading] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Check if the API has any command routes attached currently
    const hasUnsafeRoutes = api.routes && api.routes.some(r => r.purpose === 'COMMAND' || r.method !== 'GET');
    
    const isPublicBlocked = hasUnsafeRoutes && api.auth_mode !== 'PUBLIC_READ_ONLY';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (authMode === 'PUBLIC_READ_ONLY' && isPublicBlocked) {
            return alert('Cannot switch to Public Read-Only because this API currently exposes Command or Write routes. Detach those routes first.');
        }

        setLoading(true);
        try {
            const res = await updateApi(workspaceId, api.id, {
                name,
                description,
                auth_mode: authMode,
                status
            });
            onSuccess(res.data.api);
        } catch (error) {
            if (error.response?.data?.message === 'UNSAFE_ROUTES_NOT_ALLOWED') {
                alert('Cannot switch to Public mode. This API contains unsafe Command/Write routes.');
            } else {
                alert('Failed to update API');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        const isDirty = name !== api.name || description !== (api.description || '') || authMode !== api.auth_mode || status !== api.status;
        if (isDirty) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    };

    const modalFooter = (
        <div className="flex w-full justify-between items-center">
            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={status === 'ACTIVE'} onChange={e => setStatus(e.target.checked ? 'ACTIVE' : 'INACTIVE')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                    <span className="text-sm font-medium text-gray-700">API Active</span>
                </label>
            </div>
            <div className="flex space-x-3">
                <button type="button" onClick={handleClose} className="bg-white py-2 px-5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" form="edit-api-form" disabled={loading || !name} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <Modal 
                isOpen={true} 
                onClose={handleClose} 
                title="Edit API Package"
                className="max-w-2xl w-full"
                footer={modalFooter}
            >
                <form id="edit-api-form" onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            rows="2"
                        />
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Authentication Mode</h4>
                        {authMode !== api.auth_mode && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                                <span className="font-bold">Warning:</span>
                                <span>Changing the authentication mode will instantly change how clients must authorize. Ensure your clients are updated.</span>
                            </div>
                        )}
                        <div className="space-y-3">
                            <label className={`block border p-4 rounded-lg cursor-pointer transition-colors ${authMode === 'PUBLIC_READ_ONLY' ? 'border-indigo-500 bg-indigo-50' : (isPublicBlocked ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:bg-gray-50 bg-white')}`}>
                                <div className="flex items-center">
                                    <input type="radio" name="auth_mode" value="PUBLIC_READ_ONLY" disabled={isPublicBlocked} checked={authMode === 'PUBLIC_READ_ONLY'} onChange={() => setAuthMode('PUBLIC_READ_ONLY')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <div className="ml-3">
                                        <span className="block text-sm font-medium text-gray-900">Public (Read-Only)</span>
                                        <span className="block text-sm text-gray-500 mt-1">
                                            {isPublicBlocked ? 'Cannot select: API contains Command or Write routes.' : 'No authentication required. Cannot execute commands.'}
                                        </span>
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
                </form>
            </Modal>

            <ConfirmDialog 
                isOpen={showConfirmClose}
                onClose={() => setShowConfirmClose(false)}
                onConfirm={() => {
                    setShowConfirmClose(false);
                    onClose();
                }}
                title="Discard Changes"
                message="Are you sure you want to discard your unsaved changes?"
                confirmText="Discard"
                confirmVariant="danger"
            />
        </>
    );
};

export default EditApiModal;
