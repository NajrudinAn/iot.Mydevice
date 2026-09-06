import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Terminal, Settings2 } from 'lucide-react';

const DeviceCommandPanel = ({ workspaceId, deviceId, hardwareId, capabilities = [], deviceStatus }) => {
    const [sendingAction, setSendingAction] = useState(null);
    
    // Local state for dynamic forms
    const [formStates, setFormStates] = useState({});

    // Keep track of live actual state from telemetry
    const [liveState, setLiveState] = useState({});
    
    // Command feedback state
    const [commandFeedback, setCommandFeedback] = useState(null);

    useEffect(() => {
        const handleTelemetryUpdate = (e) => {
            const event = e.detail;
            if (event && event.data && (event.deviceId === hardwareId || event.device_id === hardwareId || event.deviceId === deviceId)) {
                const flatData = flattenJSON(event.data);
                setLiveState(prev => ({ ...prev, ...flatData }));
            }
        };

        window.addEventListener('device-telemetry-update', handleTelemetryUpdate);
        
        const handleCommandUpdate = (e) => {
            const event = e.detail;
            if (event && (event.deviceId === hardwareId || event.deviceId === deviceId)) {
                if (event.status === 'FAILED' || event.status === 'REJECTED') {
                    setCommandFeedback({
                        type: 'error',
                        message: event.errorCode ? `${event.errorCode}: ${event.errorMessage || 'Command execution failed'}` : 'Command failed'
                    });
                    setTimeout(() => setCommandFeedback(null), 5000);
                } else if (event.status === 'COMPLETED') {
                    setCommandFeedback({
                        type: 'success',
                        message: 'Command executed successfully'
                    });
                    setTimeout(() => setCommandFeedback(null), 3000);
                }
            }
        };

        window.addEventListener('device-command-update', handleCommandUpdate);
        
        return () => {
            window.removeEventListener('device-telemetry-update', handleTelemetryUpdate);
            window.removeEventListener('device-command-update', handleCommandUpdate);
        };
    }, [deviceId, hardwareId]);

    const flattenJSON = (obj, prefix = '') => {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                Object.assign(acc, flattenJSON(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    };

    const sendCommand = async (type, payload = {}) => {
        setSendingAction(type);
        try {
            const token = localStorage.getItem('platform_token');
            const res = await fetch(`/api/workspaces/${workspaceId}/devices/${deviceId}/commands`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, payload })
            });
            const data = await res.json();
            if (!data.success) {
                alert(`Error: ${data.message}`);
            }
            // Realtime command status updates will be handled at the top level or via notifications
            // since we removed command history from this panel.
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setSendingAction(null);
        }
    };
    
    const handleFormChange = (capId, actionName, paramName, value, type) => {
        setFormStates(prev => ({
            ...prev,
            [`${capId}_${actionName}`]: {
                ...(prev[`${capId}_${actionName}`] || {}),
                [paramName]: type === 'number' ? Number(value) : value
            }
        }));
    };

    // Group actions
    const groupedActions = {};
    
    capabilities.forEach(cap => {
        const groupName = cap.label || cap.name;
        if (!groupedActions[groupName]) {
            groupedActions[groupName] = { label: groupName, state_mapping: cap.state_mapping, actions: [] };
        }
        if (cap.actions) {
            cap.actions.forEach(action => {
                groupedActions[groupName].actions.push({
                    ...action,
                    capability_id: cap.id
                });
            });
        }
    });

    const groups = Object.values(groupedActions);

    return (
        <div className="command-panel">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <Terminal size={20} className="text-indigo-600" />
                    Device Actions & Capabilities
                </h3>
            </div>
            
            {commandFeedback && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${commandFeedback.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'}`}>
                    <span className="font-medium">{commandFeedback.message}</span>
                </div>
            )}

            {groups.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 mb-10">
                    {groups.map((group, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                            <div className="flex justify-between items-start mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-white">{group.label}</h4>
                                </div>
                                {group.state_mapping && group.state_mapping.path && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Actual State</p>
                                        {deviceStatus !== 'ONLINE' && (
                                            <p className="text-xs text-gray-400 mb-1">
                                                Last known: {liveState[group.state_mapping.path] !== undefined ? liveState[group.state_mapping.path] : 'Unknown'}
                                            </p>
                                        )}
                                        <p className={`font-mono font-medium px-3 py-1 rounded border ${deviceStatus === 'ONLINE' ? 'text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600' : 'text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                            {deviceStatus !== 'ONLINE' ? 'OFFLINE' : (
                                                liveState[group.state_mapping.path] !== undefined 
                                                    ? (liveState.power === 'OFF' && group.state_mapping.path !== 'power' ? 'Turned Off' :
                                                       liveState[group.state_mapping.path] === "ON" ? "● ON" : 
                                                       liveState[group.state_mapping.path] === "OFF" ? "○ OFF" : 
                                                       `${liveState[group.state_mapping.path]} ${group.state_mapping.unit || ''}`.trim())
                                                    : 'Unknown'
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                {group.actions.map(action => {
                                    const params = action.parameters ? (typeof action.parameters === 'string' ? JSON.parse(action.parameters) : action.parameters) : {};
                                    const hasParams = Object.keys(params).length > 0;
                                    const capId = action.capability_id || group.label;
                                    const actualState = group.state_mapping && group.state_mapping.path ? liveState[group.state_mapping.path] : undefined;
                                    
                                    if (action.target_state !== undefined && actualState !== undefined) {
                                        if (String(actualState) === String(action.target_state)) {
                                            return null;
                                        }
                                    }
                                    
                                    const isOffline = deviceStatus !== 'ONLINE';
                                    const hasStateMapping = group.state_mapping && group.state_mapping.path;
                                    const isStateUnknown = hasStateMapping && actualState === undefined;
                                    const isSendingThisAction = sendingAction === action.name;
                                    const isDisabled = isSendingThisAction || isOffline || isStateUnknown;
                                    
                                    return (
                                        <div key={action.name} className={`rounded-lg p-4 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDisabled ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-75' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                                            <div>
                                                <h5 className="font-medium text-gray-900 dark:text-white">{action.label}</h5>
                                                {action.description && <p className="text-sm text-gray-500 mt-1">{action.description}</p>}
                                                <code className="text-xs text-gray-400 mt-2 block">{action.name}</code>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-3">
                                                {hasParams ? (
                                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                                        {Object.entries(params).map(([paramName, paramSchema]) => (
                                                            <div key={paramName} className="flex flex-col">
                                                                <label className="text-xs text-gray-500 mb-1">{paramName} {paramSchema.required && '*'}</label>
                                                                {paramSchema.type === 'enum' || paramSchema.enum ? (
                                                                    <select 
                                                                        className="w-28 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                                                        onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value, paramSchema.type)}
                                                                        defaultValue=""
                                                                        disabled={isDisabled}
                                                                    >
                                                                        <option value="" disabled>Select...</option>
                                                                        {(paramSchema.enum || paramSchema.values || []).map(val => (
                                                                            <option key={val} value={val}>{val}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : paramSchema.type === 'boolean' ? (
                                                                     <select 
                                                                        className="w-24 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                                                        onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value === 'true', 'boolean')}
                                                                        defaultValue=""
                                                                        disabled={isDisabled}
                                                                    >
                                                                        <option value="" disabled>Select...</option>
                                                                        <option value="true">True</option>
                                                                        <option value="false">False</option>
                                                                    </select>
                                                                ) : paramSchema.type === 'number' && paramSchema.min !== undefined && paramSchema.max !== undefined ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input 
                                                                            type="range"
                                                                            min={paramSchema.min}
                                                                            max={paramSchema.max}
                                                                            step={paramSchema.step || 1}
                                                                            value={formStates[`${capId}_${action.name}`]?.[paramName] ?? (typeof actualState === 'number' ? actualState : paramSchema.min)}
                                                                            className="w-24 cursor-pointer accent-indigo-600"
                                                                            onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value, 'number')}
                                                                            disabled={isDisabled}
                                                                        />
                                                                        <input 
                                                                            type="number"
                                                                            min={paramSchema.min}
                                                                            max={paramSchema.max}
                                                                            step={paramSchema.step || 1}
                                                                            value={formStates[`${capId}_${action.name}`]?.[paramName] ?? (typeof actualState === 'number' ? actualState : '')}
                                                                            placeholder={`${paramSchema.min}`}
                                                                            className="w-20 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:ring-1 focus:ring-indigo-500"
                                                                            onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value, 'number')}
                                                                            disabled={isDisabled}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <input 
                                                                        type={paramSchema.type === 'number' ? 'number' : 'text'}
                                                                        placeholder={`e.g. ${paramSchema.min || 0}`}
                                                                        min={paramSchema.min}
                                                                        max={paramSchema.max}
                                                                        className="w-24 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:ring-1 focus:ring-indigo-500"
                                                                        onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value, paramSchema.type)}
                                                                        disabled={isDisabled}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                        <Button 
                                                            onClick={() => {
                                                                const payload = formStates[`${capId}_${action.name}`] || {};
                                                                sendCommand(action.name, payload);
                                                            }}
                                                            disabled={isDisabled}
                                                            className="ml-2 mt-4"
                                                            variant="primary"
                                                        >
                                                            {isSendingThisAction ? 'Sending...' : 'Send'}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <Button 
                                                            onClick={() => sendCommand(action.name, {})}
                                                            disabled={isDisabled}
                                                            variant="outline"
                                                        >
                                                            {isSendingThisAction ? 'Sending...' : action.label}
                                                        </Button>
                                                        {isDisabled && isStateUnknown && !isOffline && (
                                                            <span className="text-xs text-amber-500">State unknown</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 border-dashed">
                    <Settings2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Executable Actions</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        This device has no registered capabilities. Connect the device to the broker to publish its capabilities.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DeviceCommandPanel;
