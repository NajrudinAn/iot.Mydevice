import React, { useState, useEffect } from 'react';
import { createRoute, updateRoute } from '../../api/apiManagement';
import { Layers, Command, Share2, Check } from 'lucide-react';
import { platformClient as api } from '../../api/client';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

const CreateRouteModal = ({ workspaceId, existingRoute, onClose, onSuccess }) => {
    const isEditing = !!existingRoute;
    const [loading, setLoading] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [devices, setDevices] = useState([]);
    const [deviceFields, setDeviceFields] = useState({});
    const [deviceCommands, setDeviceCommands] = useState({});

    const [formData, setFormData] = useState({
        name: existingRoute?.name || '',
        description: existingRoute?.description || '',
        purpose: existingRoute?.purpose || '',
        device_scope: existingRoute?.device_scope || '',
        is_active: existingRoute ? existingRoute.is_active : true,
        devices: existingRoute?.devices || [],
        data_fields: existingRoute?.data_fields || [],
        commands: existingRoute?.commands || []
    });

    const [conflictError, setConflictError] = useState('');

    useEffect(() => {
        api.get(`/workspaces/${workspaceId}/devices`).then(res => {
            const data = res.data;
            setDevices(Array.isArray(data) ? data : (data?.devices || []));
        });
    }, [workspaceId]);

    useEffect(() => {
        const fetchCapabilities = async () => {
            if (formData.purpose === 'CURRENT_DATA' || formData.purpose === 'HISTORY' || formData.purpose === 'REALTIME') {
                const targetDevices = formData.device_scope === 'ALL' ? devices.map(d => d.id) : formData.devices;
                const newFields = {};
                for (const devId of targetDevices) {
                    try {
                        const res = await api.get(`/workspaces/${workspaceId}/devices/${devId}/data-fields`);
                        const fields = Array.isArray(res.data) ? res.data : (res.data?.fields || []);
                        if (fields.length > 0) {
                            newFields[devId] = fields.map(f => f.field_name || f);
                        }
                    } catch (e) {}
                }
                setDeviceFields(newFields);
            }
            if (formData.purpose === 'COMMAND' || formData.purpose === 'REALTIME') {
                const targetDevices = formData.device_scope === 'ALL' ? devices.map(d => d.id) : formData.devices;
                const newCmds = {};
                for (const devId of targetDevices) {
                    try {
                        const res = await api.get(`/workspaces/${workspaceId}/devices/${devId}/capabilities`);
                        if (res.data.capabilities) {
                            const cmds = [];
                            res.data.capabilities.forEach(cap => {
                                // Each capability has an actions[] array — iterate those for command names
                                if (Array.isArray(cap.actions)) {
                                    cap.actions.forEach(action => {
                                        if (action.name) cmds.push(action.name);
                                    });
                                }
                                // Legacy fallback: capability itself is a command type
                                if (cmds.length === 0 && cap.name && (cap.type === 'action' || cap.type === 'enum' || cap.type === 'number')) {
                                    cmds.push(cap.name);
                                }
                            });
                            if (cmds.length > 0) {
                                newCmds[devId] = cmds;
                            }
                        }
                    } catch (e) {}
                }
                setDeviceCommands(newCmds);
            }
        };
        fetchCapabilities();
    }, [formData.purpose, formData.devices, formData.device_scope, devices, workspaceId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setConflictError('');

        if (!formData.purpose) return alert('Please select a purpose.');
        if (!formData.device_scope) return alert('Please select a device scope.');
        
        if (formData.device_scope !== 'ALL' && formData.devices.length === 0) {
            return alert('Please select at least one device.');
        }

        setLoading(true);
        try {
            if (isEditing) {
                await updateRoute(workspaceId, existingRoute.id, formData);
            } else {
                await createRoute(workspaceId, formData);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.status === 409) {
                setConflictError('This route already exists in this workspace.');
            } else {
                alert(error.response?.data?.message || 'Failed to save route');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleDataField = (devId, field) => {
        const specific = `${devId}::${field}`;
        if (formData.data_fields.includes(specific)) {
            setFormData({ ...formData, data_fields: formData.data_fields.filter(f => f !== specific) });
        } else {
            setFormData({ ...formData, data_fields: [...formData.data_fields, specific] });
        }
    };

    const toggleCommand = (devId, cmd) => {
        const specific = `${devId}::${cmd}`;
        if (formData.commands.includes(specific)) {
            setFormData({ ...formData, commands: formData.commands.filter(c => c !== specific) });
        } else {
            setFormData({ ...formData, commands: [...formData.commands, specific] });
        }
    };

    const toggleDevice = (devId, single) => {
        if (single) {
            setFormData({ ...formData, devices: [devId] });
            return;
        }
        if (formData.devices.includes(devId)) {
            setFormData({ ...formData, devices: formData.devices.filter(d => d !== devId) });
        } else {
            setFormData({ ...formData, devices: [...formData.devices, devId] });
        }
    };

    const getDeviceName = (devId) => {
        const d = devices.find(x => x.id === devId);
        return d ? `${d.name} (${d.device_id})` : devId;
    };

    const handleClose = () => {
        const isDirty = formData.name !== (existingRoute?.name || '') ||
                        formData.purpose !== (existingRoute?.purpose || '');
        if (isDirty) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    };

    const isFormValid = formData.name && formData.purpose && formData.device_scope;

    const modalTitle = (
        <div className="flex items-start gap-4 -mt-1 -ml-1">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-500 shrink-0 flex-center">
                <Share2 size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 tracking-tight leading-none mb-1.5">{isEditing ? 'Edit API Route' : 'Create API Route'}</span>
                <span className="text-sm font-medium text-gray-500">Configure a reusable endpoint for authorized workspace resources.</span>
            </div>
        </div>
    );

    const modalFooter = (
        <div className="flex-between w-full">
            <div>
                {isEditing && (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 h-4 w-4" />
                        <span className="text-sm font-bold text-gray-700">Route Active</span>
                    </label>
                )}
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={handleClose} className="btn btn-secondary px-6 py-2.5">Cancel</button>
                <button type="submit" form="route-form" disabled={loading || !isFormValid} className="ds-btn px-6 py-2.5">{loading ? 'Saving...' : 'Save Route'}</button>
            </div>
        </div>
    );

    return (
        <>
            <Modal 
                isOpen={true} 
                onClose={handleClose} 
                title={modalTitle} 
                className="max-w-2xl w-full !p-0 !overflow-hidden bg-white"
                footer={modalFooter}
            >
            <div className="p-1 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <form id="route-form" onSubmit={handleSubmit} className="space-y-4">
                    
                    {conflictError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                            <span className="text-sm font-bold">{conflictError}</span>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500 shrink-0">
                                <Layers size={22} />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-bold text-gray-900 leading-none mb-1.5">Basic Information</h4>
                                <p className="text-xs text-gray-500">Give your route a clear name and description.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1.5">Route Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required placeholder="e.g. Current Data"
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="form-input"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">Use a short, descriptive name (lowercase, hyphens allowed).</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1.5">Description (Optional)</label>
                                <input
                                    type="text" placeholder="e.g. Fetches real-time sensor data"
                                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="form-input"
                                />
                                <p className="text-[11px] text-gray-400 mt-1 flex justify-between">
                                    <span>Briefly describe what this route does.</span>
                                    <span>{formData.description.length}/200</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Execution Rules */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-2.5 bg-purple-light rounded-xl text-purple shrink-0">
                                <Command size={22} />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-bold text-gray-900 leading-none mb-1.5">Execution Rules</h4>
                                <p className="text-xs text-gray-500">Define the purpose and scope for this route.</p>
                            </div>
                        </div>
                        
                        <div className="mb-5">
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">Purpose <span className="text-red-500">*</span></label>
                            <select 
                                value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})}
                                className="form-select"
                            >
                                <option value="" disabled>Select a purpose...</option>
                                <option value="CURRENT_DATA">Current Data</option>
                                <option value="HISTORY">Historical Data</option>
                                <option value="DEVICE_STATUS">Device Status</option>
                                <option value="COMMAND">Send Command</option>
                                <option value="REALTIME">Realtime Stream (SSE)</option>
                            </select>
                            <p className="text-[11px] text-gray-400 mt-1">Select a purpose to categorize and reuse this route.</p>
                        </div>

                        {formData.purpose && (
                            <div className="space-y-5 pt-5 border-t border-gray-200">
                                {/* Device Scope */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Device Scope</label>
                                    <p className="text-xs text-gray-500 mb-3">Choose which devices this route will apply to.</p>
                                    
                                    <div className="flex flex-col gap-2 mb-3">
                                        {[
                                            { id: 'SINGLE', title: 'Single Device', desc: 'Apply this route to one specific device.' },
                                            { id: 'SELECTED', title: 'Selected Devices', desc: 'Apply this route to multiple selected devices.' },
                                            { id: 'ALL', title: 'All Devices', desc: 'Apply this route to all devices in the workspace.' }
                                        ].map(scope => {
                                            const isSelected = formData.device_scope === scope.id;
                                            return (
                                                <label 
                                                    key={scope.id} 
                                                    className="flex items-start gap-3 p-3 cursor-pointer rounded-xl border transition-all"
                                                    style={{
                                                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                                                        backgroundColor: isSelected ? 'var(--primary-transparent)' : '#ffffff'
                                                    }}
                                                >
                                                    <div className="flex items-center h-4 mt-0.5">
                                                        <input 
                                                            type="radio" 
                                                            className="w-4 h-4 shrink-0" 
                                                            style={{ accentColor: 'var(--primary)' }}
                                                            name="dscope" 
                                                            value={scope.id} 
                                                            checked={isSelected} 
                                                            onChange={() => setFormData({...formData, device_scope: scope.id, devices: []})} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="block text-sm font-bold text-gray-900 leading-none">{scope.title}</span>
                                                        <span className="block text-xs text-gray-500 mt-1">{scope.desc}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="bg-slate-50/50 rounded-xl p-3 border border-gray-200">
                                        {formData.device_scope === 'ALL' && (
                                            <p className="text-[13px] text-gray-600 font-medium p-1">
                                                This route will apply to all devices currently in this workspace.
                                            </p>
                                        )}

                                        {formData.device_scope === 'SINGLE' && (
                                            <div>
                                                <select 
                                                    value={formData.devices[0] || ''} 
                                                    onChange={e => toggleDevice(e.target.value, true)}
                                                    className="form-select"
                                                >
                                                    <option value="" disabled>Select a device...</option>
                                                    {devices.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name} ({d.device_id})</option>
                                                    ))}
                                                </select>
                                                <p className="text-[11px] text-gray-400 mt-1">Select the device for this route.</p>
                                            </div>
                                        )}
                                        
                                        {formData.device_scope === 'SELECTED' && (
                                            <div>
                                                <div className="bg-white border border-gray-200 rounded-xl max-h-40 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
                                                    {devices.length === 0 ? <p className="text-[13px] text-gray-500 italic p-1">No devices found.</p> : null}
                                                    {devices.map(d => (
                                                        <label key={d.id} className="flex items-center gap-3 p-2 bg-white hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200 hover:border-blue-300 transition-all">
                                                            <input 
                                                                type="checkbox" 
                                                                className="rounded h-3.5 w-3.5" 
                                                                style={{ accentColor: 'var(--primary)' }}
                                                                checked={formData.devices.includes(d.id)} 
                                                                onChange={() => toggleDevice(d.id)} 
                                                            />
                                                            <span className="text-[13px] text-gray-900 font-bold">{d.name} <span className="text-[11px] text-gray-500 font-medium ml-1">({d.device_id})</span></span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-1">Select the devices for this route.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Data Fields UI */}
                                {(formData.purpose === 'CURRENT_DATA' || formData.purpose === 'HISTORY' || formData.purpose === 'REALTIME') && (formData.device_scope === 'ALL' || formData.devices.length > 0) && (
                                    <div className="pt-5 border-t border-gray-200">
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Allowed Data Fields</label>
                                        <p className="text-xs text-gray-500 mb-3">Select fields to restrict the JSON response. Leave all unchecked to allow all data.</p>
                                        
                                        {Object.keys(deviceFields).length === 0 ? (
                                            <p className="text-[13px] text-gray-500 font-medium p-3 bg-slate-50 rounded-xl border border-gray-200">No data fields found.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {Object.entries(deviceFields).map(([devId, fields]) => (
                                                    <div key={devId} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                                        <div className="text-[13px] font-bold text-gray-900 mb-2">{getDeviceName(devId)}</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {fields.map(field => {
                                                                const isSelected = formData.data_fields.includes(`${devId}::${field}`) || formData.data_fields.includes(field);
                                                                return (
                                                                    <label 
                                                                        key={`${devId}-${field}`} 
                                                                        className="inline-flex items-center justify-center px-3 py-1 rounded-full border cursor-pointer text-[11px] font-mono font-medium transition-all"
                                                                        style={isSelected 
                                                                            ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)', color: '#ffffff', boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)' } 
                                                                            : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#475569' }
                                                                        }
                                                                    >
                                                                        <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleDataField(devId, field)} />
                                                                        {field}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Commands UI */}
                                {formData.purpose === 'COMMAND' && (formData.device_scope === 'ALL' || formData.devices.length > 0) && (
                                    <div className="pt-5 border-t border-gray-200">
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Allowed Commands</label>
                                        <p className="text-xs text-gray-500 mb-3">Select which commands this route is authorized to execute. Leave all unchecked to allow all.</p>
                                        
                                        {Object.keys(deviceCommands).length === 0 ? (
                                            <p className="text-[13px] text-gray-500 font-medium p-3 bg-slate-50 rounded-xl border border-gray-200">No capabilities found.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {Object.entries(deviceCommands).map(([devId, cmds]) => (
                                                    <div key={devId} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                                        <div className="text-[13px] font-bold text-gray-900 mb-2">{getDeviceName(devId)}</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {cmds.map(cmd => {
                                                                const isSelected = formData.commands.includes(`${devId}::${cmd}`) || formData.commands.includes(cmd);
                                                                return (
                                                                    <label 
                                                                        key={`${devId}-${cmd}`} 
                                                                        className="inline-flex items-center justify-center px-3 py-1 rounded-full border cursor-pointer text-[11px] font-mono font-medium transition-all"
                                                                        style={isSelected 
                                                                            ? { borderColor: 'var(--purple)', backgroundColor: 'var(--purple)', color: '#ffffff', boxShadow: '0 1px 3px rgba(139, 92, 246, 0.25)' } 
                                                                            : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#475569' }
                                                                        }
                                                                    >
                                                                        <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleCommand(devId, cmd)} />
                                                                        {cmd}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Realtime Scoping */}
                                {formData.purpose === 'REALTIME' && (
                                    <div className="pt-5 border-t border-gray-200">
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Realtime Events</label>
                                        <p className="text-xs text-gray-500 mb-3">Select which event types to stream over SSE.</p>
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1.5">
                                            {[
                                                { id: 'telemetry', label: 'Telemetry Updates' },
                                                { id: 'device_status', label: 'Device Status Changes' },
                                                { id: 'command_status', label: 'Command Status Updates' }
                                            ].map(evt => (
                                                <label key={evt.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-all">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded h-3.5 w-3.5" 
                                                        style={{ accentColor: 'var(--primary)' }}
                                                        checked={formData.commands.includes(evt.id) || formData.commands.includes('REALTIME::' + evt.id)} 
                                                        onChange={() => toggleCommand('REALTIME', evt.id)} 
                                                    />
                                                    <span className="text-[13px] text-gray-900 font-bold">{evt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </form>
            </div>
            </Modal>

            <ConfirmDialog 
                isOpen={showConfirmClose}
                onClose={() => setShowConfirmClose(false)}
                onConfirm={() => {
                    setShowConfirmClose(false);
                    onClose();
                }}
                title="Discard Changes"
                message="Are you sure you want to discard your unsaved changes? This action cannot be undone."
                confirmText="Discard"
                confirmVariant="danger"
            />
        </>
    );
};

export default CreateRouteModal;

