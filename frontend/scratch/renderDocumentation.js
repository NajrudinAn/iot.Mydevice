    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
    };

    const renderDocumentation = () => {
        const isPublic = apiData.auth_mode === 'PUBLIC_READ_ONLY';
        const isSession = apiData.auth_mode === 'APPLICATION_SESSION';
        const isApiKey = apiData.auth_mode === 'API_KEY_SECRET';
        
        const baseUrl = window.location.origin + (isPublic ? `/api/v1/public/${apiData.api_slug}` : `/api/v1/routes`);
        
        // 1. Authentication Section
        const renderAuthSection = () => {
            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Key size={20} className="text-gray-400" /> Authentication
                    </h4>
                    
                    {isPublic && (
                        <div>
                            <span className="inline-block bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-green-100">None Required</span>
                            <p className="text-gray-600 text-sm">
                                This is a Public Read-Only API. No login, API key, or secret is required to access the endpoints below.
                            </p>
                        </div>
                    )}

                    {isApiKey && (
                        <div>
                            <span className="inline-block bg-purple-50 text-purple-700 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-purple-100">API Key + Secret</span>
                            <p className="text-gray-600 text-sm mb-4">
                                This API requires an active API Key and Secret. You must generate a credential in the Credentials tab. The secret is displayed only once during generation—store it securely. Revoked credentials will be instantly denied access.
                            </p>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-200">Required Headers</div>
                                <div className="p-4 relative">
                                    <pre className="text-sm font-mono text-gray-800 m-0">
{`X-API-Key: <your-api-key>
X-API-Secret: <your-api-secret>`}</pre>
                                    <button onClick={() => handleCopy(`X-API-Key: <your-api-key>\nX-API-Secret: <your-api-secret>`)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSession && (
                        <div>
                            <span className="inline-block bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-blue-100">Application Session (JWT)</span>
                            <p className="text-gray-600 text-sm mb-4">
                                This API is protected by MyDevice Session Authentication. You must obtain a token by logging into the MyDevice Platform (<code>/api/auth/login</code>) or a specific Workspace Application (<code>/api/applications/&lt;app_id&gt;/auth/login</code>).
                                If you already have an active MyDevice session, no second login is required.
                            </p>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-200">Required Header</div>
                                <div className="p-4 relative">
                                    <pre className="text-sm font-mono text-gray-800 m-0">Authorization: Bearer &lt;jwt_token&gt;</pre>
                                    <button onClick={() => handleCopy(`Authorization: Bearer <jwt_token>`)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        // 2. Quick Start / Base URL
        const renderQuickStart = () => {
            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Start</h4>
                    <p className="text-gray-600 text-sm mb-4">All routes documented below are relative to this Base URL.</p>
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <code className="text-sm font-mono text-gray-900 select-all">{baseUrl}</code>
                        <button onClick={() => handleCopy(baseUrl)} className="p-2 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            );
        };

        // 3. Route Details
        const renderRouteDetails = (route) => {
            const methodColor = route.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
            const endpointUrl = `${baseUrl}/${route.endpoint_slug}`;
            
            // Generate Example Request & Response
            let requestHeaders = '';
            let requestBody = null;
            let responseJson = '';
            let urlParams = '';

            if (isApiKey) {
                requestHeaders = `  -H "X-API-Key: <your-api-key>" \\\n  -H "X-API-Secret: <your-api-secret>"`;
            } else if (isSession) {
                requestHeaders = `  -H "Authorization: Bearer <jwt_token>"`;
            }

            if (route.purpose === 'CURRENT_DATA' || route.purpose === 'HISTORY') {
                urlParams = `?device_id=<device_id>&limit=100`;
                let fakePayload = {};
                if (route.data_permissions && route.data_permissions.length > 0) {
                    route.data_permissions.forEach(p => {
                        let field = p.field_path.includes('::') ? p.field_path.split('::')[1] : p.field_path;
                        const parts = field.split('.');
                        let current = fakePayload;
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) current[parts[i]] = {};
                            current = current[parts[i]];
                        }
                        current[parts[parts.length - 1]] = `<value>`;
                    });
                } else {
                    fakePayload = { "temperature": 24.5, "humidity": 60 };
                }

                responseJson = JSON.stringify({
                    success: true,
                    data: [
                        {
                            device_id: "<device_uuid>",
                            recorded_at: "2024-01-01T12:00:00.000Z",
                            payload: fakePayload
                        }
                    ]
                }, null, 2);
            } 
            else if (route.purpose === 'DEVICE_STATUS') {
                responseJson = JSON.stringify({
                    success: true,
                    devices: [
                        {
                            id: "<uuid>",
                            device_id: "SENSOR-01",
                            name: "Main Thermostat",
                            status: "ONLINE",
                            last_seen: "2024-01-01T12:00:00.000Z"
                        }
                    ]
                }, null, 2);
            }
            else if (route.purpose === 'COMMAND') {
                requestBody = JSON.stringify({
                    device_id: "<device_uuid>",
                    type: "<command_type>",
                    payload: {
                        "parameter_name": "<value>"
                    }
                }, null, 2);

                responseJson = JSON.stringify({
                    success: true,
                    message: "Command sent",
                    command: {
                        id: "<command_uuid>",
                        device_id: "<device_uuid>",
                        type: "<command_type>",
                        status: "PENDING",
                        created_at: "2024-01-01T12:00:00.000Z"
                    }
                }, null, 2);
            }
            else if (route.purpose === 'REALTIME') {
                responseJson = `// Realtime streams are Server-Sent Events (SSE)
// The stream emits standard EventSource formatted data.

event: device_data
data: {"device_id": "<uuid>", "recorded_at": "...", "payload": {...}}

event: device_status
data: {"deviceId": "<uuid>", "status": "ONLINE", "lastSeen": "..."}`;
            }

            const curlCmd = `curl -X ${route.method} "${endpointUrl}${urlParams}" \\
${requestHeaders}${requestBody ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'` : ''}`;

            return (
                <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    {/* Header */}
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className={`font-bold px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wide ${methodColor}`}>
                                {route.method}
                            </span>
                            <code className="text-[15px] font-bold text-gray-900">/{route.endpoint_slug}</code>
                        </div>
                        <span className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {route.purpose}
                        </span>
                    </div>

                    <div className="p-6">
                        <p className="text-gray-600 text-sm mb-6 pb-6 border-b border-gray-100">
                            {route.description || 'No description provided.'}
                        </p>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
                            <div>
                                <h5 className="font-bold text-gray-900 mb-1 text-[12px] uppercase tracking-wider">Authentication Required</h5>
                                <p className="text-gray-600">{isPublic ? 'No' : 'Yes'}</p>
                            </div>
                            <div>
                                <h5 className="font-bold text-gray-900 mb-1 text-[12px] uppercase tracking-wider">Device Scope</h5>
                                <p className="text-gray-600">{route.device_scope === 'GLOBAL' ? 'All Workspace Devices' : 'Selected Devices Only'}</p>
                            </div>
                        </div>

                        {/* Realtime EventSource Note */}
                        {route.purpose === 'REALTIME' && !isPublic && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-8">
                                <h5 className="font-bold text-yellow-800 text-sm mb-1">⚠️ EventSource Authentication Limit</h5>
                                <p className="text-yellow-700 text-xs leading-relaxed">
                                    The native browser <code>new EventSource()</code> API does not support sending custom HTTP headers (like <code>Authorization</code> or <code>X-API-Key</code>).
                                    To connect to this secure stream from a web browser, use a polyfill library such as <code>@microsoft/fetch-event-source</code> which allows custom headers, or connect via a backend proxy.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Request Column */}
                            <div className="space-y-6">
                                <div>
                                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Example Request (cURL)</h5>
                                    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                        <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-400">bash</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto">
                                            <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">{curlCmd}</pre>
                                        </div>
                                        <button onClick={() => handleCopy(curlCmd)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-[#3d3d3d] border border-gray-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Response Column */}
                            <div className="space-y-6">
                                <div>
                                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Response</h5>
                                    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 relative group">
                                        <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-400">json / text/event-stream</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto max-h-80">
                                            <pre className="text-xs font-mono text-gray-300 m-0 leading-relaxed">{responseJson}</pre>
                                        </div>
                                        <button onClick={() => handleCopy(responseJson)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-[#3d3d3d] border border-gray-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            );
        };

        // 4. Errors
        const renderErrors = () => {
            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">Error Responses</h4>
                    <p className="text-gray-600 text-sm mb-6">
                        The API runtime uses standard HTTP status codes. Below are errors specifically generated by this API's execution layer.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">400</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Bad Request</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned if a route purpose is unknown, or if a command request is missing `device_id` or `type`.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">401</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Unauthorized</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned for missing authentication, invalid API keys, invalid secrets, or expired JWT tokens.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">403</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Forbidden</h6>
                                <p className="text-xs text-gray-600 mt-1">Token/Key is valid, but access is denied. Reasons include: executing a command on a public route, API package is disabled, missing device permissions, or command type is not explicitly allowed.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">404</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Not Found</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned if the endpoint slug does not exist, the route is disabled, or a targeted device does not exist.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                            <span className="font-mono font-bold text-red-600 shrink-0">405</span>
                            <div>
                                <h6 className="font-bold text-sm text-gray-900">Method Not Allowed</h6>
                                <p className="text-xs text-gray-600 mt-1">Returned when calling a route with an unsupported HTTP method (e.g., POSTing to a GET route).</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Documentation</h3>
                        <p className="text-gray-500 mt-1" style={{ fontSize: '15px' }}>Technical details, requests, and integration specifications for this API.</p>
                    </div>
                </div>

                {renderAuthSection()}
                {renderQuickStart()}
                
                {apiData.routes?.length > 0 ? (
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">Available Routes</h4>
                        {apiData.routes.map(r => renderRouteDetails(r))}
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center mb-8">
                        <FileText size={32} className="text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-gray-900">No Routes Attached</h4>
                        <p className="text-gray-500 mt-1">Attach routes to this API to generate documentation.</p>
                    </div>
                )}

                {renderErrors()}

            </div>
        );
    };
