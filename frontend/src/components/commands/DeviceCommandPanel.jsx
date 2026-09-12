import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Terminal, Settings2 } from 'lucide-react';

const DeviceCommandPanel = ({ workspaceId, deviceId, hardwareId, capabilities = [], deviceStatus, readOnly = false }) => {
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

    // ─── readOnly mode: clean capability reference ───────────────────────────────
    if (readOnly) {
        if (groups.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <Settings2 size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#6b7280' }}>No capabilities registered</div>
                    <div style={{ fontSize: '12px' }}>Publish to the capabilities topic to register device actions.</div>
                </div>
            );
        }

        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Settings2 size={18} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>Device Capabilities</span>
                    <span style={{ marginLeft: '4px', background: '#ede9fe', color: '#6d28d9', borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: 700 }}>{groups.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {groups.map((group, idx) => (
                        <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
                            {/* Group Header */}
                            <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0 }} />
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{group.label}</span>
                                </div>
                                {group.state_mapping?.path && (
                                    <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                        state → {group.state_mapping.path}{group.state_mapping.unit ? ` (${group.state_mapping.unit})` : ''}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {group.actions.map((action, aIdx) => {
                                    const params = action.parameters ? (typeof action.parameters === 'string' ? JSON.parse(action.parameters) : action.parameters) : {};
                                    const paramEntries = Object.entries(params);
                                    return (
                                        <div key={action.name} style={{ padding: '14px 16px', borderBottom: aIdx < group.actions.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {/* Action title row */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>{action.label}</span>
                                                        <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '1px 7px', borderRadius: '4px', border: '1px solid #ede9fe' }}>{action.name}</code>
                                                    </div>
                                                    {action.description && (
                                                        <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{action.description}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Parameters */}
                                            {paramEntries.length > 0 ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                                    {paramEntries.map(([pName, pSchema]) => {
                                                        const typeColor = pSchema.type === 'number' ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
                                                            : pSchema.type === 'boolean' ? { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
                                                            : pSchema.type === 'enum' ? { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
                                                            : { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
                                                        return (
                                                            <div key={pName} style={{ display: 'inline-flex', alignItems: 'center', gap: '0', border: `1px solid ${typeColor.border}`, borderRadius: '6px', overflow: 'hidden', fontSize: '11.5px' }}>
                                                                <span style={{ padding: '3px 8px', fontWeight: 600, color: '#374151', background: '#f9fafb', borderRight: `1px solid ${typeColor.border}`, fontFamily: 'monospace' }}>
                                                                    {pName}{pSchema.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
                                                                </span>
                                                                <span style={{ padding: '3px 8px', background: typeColor.bg, color: typeColor.text, fontWeight: 600 }}>
                                                                    {pSchema.type || 'string'}
                                                                </span>
                                                                {pSchema.min !== undefined && pSchema.max !== undefined && (
                                                                    <span style={{ padding: '3px 8px', color: '#6b7280', background: '#f9fafb', borderLeft: `1px solid ${typeColor.border}` }}>
                                                                        {pSchema.min} – {pSchema.max}{pSchema.step && pSchema.step !== 1 ? ` / ${pSchema.step}` : ''}
                                                                    </span>
                                                                )}
                                                                {(pSchema.enum || pSchema.values) && (
                                                                    <span style={{ padding: '3px 8px', color: '#6b7280', background: '#f9fafb', borderLeft: `1px solid ${typeColor.border}` }}>
                                                                        {(pSchema.enum || pSchema.values).join(' | ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>No parameters</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────────

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                    {groups.map((group, idx) => (
                        <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                                <div>
                                    <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', margin: 0 }}>{group.label}</h4>
                                </div>
                                {group.state_mapping && group.state_mapping.path && (
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>Actual State</p>
                                        <p style={{
                                          fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px',
                                          background: deviceStatus === 'ONLINE' ? '#f8fafc' : '#f1f5f9',
                                          color: deviceStatus === 'ONLINE' ? '#0f172a' : '#94a3b8',
                                          border: '1px solid #e2e8f0'
                                        }}>
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
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                        <div key={action.name} style={{ 
                                          background: isDisabled ? '#f8fafc' : '#fff', borderRadius: '12px', padding: '20px', 
                                          border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px',
                                          opacity: isDisabled ? 0.7 : 1
                                        }}>
                                            <div>
                                                <h5 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{action.label}</h5>
                                                {action.description && <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: 0 }}>{action.description}</p>}
                                                <code style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', display: 'block' }}>{action.name}</code>
                                            </div>
                                            
                                            <div style={{ 
                                              display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', 
                                              background: isDisabled ? 'transparent' : '#f8fafc', padding: isDisabled ? '0' : '16px', 
                                              borderRadius: '12px', border: isDisabled ? 'none' : '1px solid #f1f5f9' 
                                            }}>
                                                {hasParams ? (
                                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
                                                        {Object.entries(params).map(([paramName, paramSchema]) => (
                                                            <div key={paramName} style={{ display: 'flex', flexDirection: 'column', flex: paramSchema.type === 'number' ? 1 : 'none', minWidth: '200px' }}>
                                                                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>{paramName} {paramSchema.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                                                {paramSchema.type === 'enum' || paramSchema.enum ? (
                                                                    <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                                                                        {(paramSchema.enum || paramSchema.values || []).map(val => {
                                                                            const isSelected = formStates[`${capId}_${action.name}`]?.[paramName] === val;
                                                                            return (
                                                                                <button
                                                                                    key={val}
                                                                                    onClick={() => handleFormChange(capId, action.name, paramName, val, paramSchema.type)}
                                                                                    disabled={isDisabled}
                                                                                    style={{
                                                                                        padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                                                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                        background: isSelected ? '#fff' : 'transparent',
                                                                                        color: isSelected ? '#0f172a' : '#64748b',
                                                                                        boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                                                        border: 'none', transition: 'all 0.2s', minWidth: '80px'
                                                                                    }}
                                                                                >
                                                                                    {val}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : paramSchema.type === 'boolean' ? (
                                                                     <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                                                                        {[{ label: 'ON', value: true }, { label: 'OFF', value: false }].map(opt => {
                                                                            const isSelected = formStates[`${capId}_${action.name}`]?.[paramName] === opt.value;
                                                                            return (
                                                                                <button
                                                                                    key={opt.label}
                                                                                    onClick={() => handleFormChange(capId, action.name, paramName, opt.value, 'boolean')}
                                                                                    disabled={isDisabled}
                                                                                    style={{
                                                                                        padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                                                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                        background: isSelected ? (opt.value ? '#10b981' : '#ef4444') : 'transparent',
                                                                                        color: isSelected ? '#fff' : '#64748b',
                                                                                        boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                                                                        border: 'none', transition: 'all 0.2s', minWidth: '80px'
                                                                                    }}
                                                                                >
                                                                                    {opt.label}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : paramSchema.type === 'number' && paramSchema.min !== undefined && paramSchema.max !== undefined ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '40px' }}>
                                                                        <input 
                                                                            type="range"
                                                                            min={paramSchema.min}
                                                                            max={paramSchema.max}
                                                                            step={paramSchema.step || 1}
                                                                            value={formStates[`${capId}_${action.name}`]?.[paramName] ?? (typeof actualState === 'number' ? actualState : paramSchema.min)}
                                                                            style={{ flex: 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                                                            onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value, 'number')}
                                                                            disabled={isDisabled}
                                                                        />
                                                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', width: '40px', textAlign: 'right' }}>
                                                                            {formStates[`${capId}_${action.name}`]?.[paramName] ?? (typeof actualState === 'number' ? actualState : paramSchema.min)}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <input 
                                                                        type={paramSchema.type === 'number' ? 'number' : 'text'}
                                                                        placeholder={`e.g. ${paramSchema.min || 0}`}
                                                                        min={paramSchema.min}
                                                                        max={paramSchema.max}
                                                                        style={{ 
                                                                          padding: '8px 16px', fontSize: '14px', borderRadius: '8px', 
                                                                          border: '1px solid #cbd5e1', outline: 'none', height: '40px'
                                                                        }}
                                                                        onChange={(e) => handleFormChange(capId, action.name, paramName, e.target.value, paramSchema.type)}
                                                                        disabled={isDisabled}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                        
                                                        <button 
                                                            onClick={() => {
                                                                const payload = formStates[`${capId}_${action.name}`] || {};
                                                                sendCommand(action.name, payload);
                                                            }}
                                                            disabled={isDisabled}
                                                            style={{
                                                              background: '#2563eb', color: '#fff', padding: '0 24px', borderRadius: '8px',
                                                              fontSize: '14px', fontWeight: 700, border: 'none', cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                              opacity: isDisabled ? 0.5 : 1, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                        >
                                                            {isSendingThisAction ? 'Sending...' : 'Execute'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <button 
                                                            onClick={() => sendCommand(action.name, {})}
                                                            disabled={isDisabled}
                                                            style={{
                                                              background: '#f1f5f9', color: '#0f172a', padding: '10px 24px', borderRadius: '8px',
                                                              fontSize: '14px', fontWeight: 700, border: '1px solid #e2e8f0', cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                              opacity: isDisabled ? 0.5 : 1
                                                            }}
                                                        >
                                                            {isSendingThisAction ? 'Sending...' : action.label}
                                                        </button>
                                                        {isDisabled && isStateUnknown && !isOffline && (
                                                            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>State unknown</span>
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
