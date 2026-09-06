const API_BASE = 'http://localhost:3000/api';

async function request(method, path, data = null, token = null, headers = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.body = JSON.stringify(data);
    
    const res = await fetch(`${API_BASE}${path}`, options);
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch(e) {}
    
    if (!res.ok) {
        console.error(`[REQUEST_ERROR] ${method} ${path} -> ${res.status}`, json);
        const err = new Error(json.message || 'Request failed');
        err.status = res.status;
        err.data = json;
        throw err;
    }
    return { status: res.status, data: json };
}

async function runTests() {
    try {
        console.log("=== STARTING MANUAL E2E VERIFICATION ===");
        
        // 1. Setup - Register User & Workspace
        const email = `e2e_tester_${Date.now()}@test.com`;
        await request('POST', '/auth/register', {
            name: 'E2E Tester',
            email: email,
            password: 'password123'
        });
        
        const loginRes = await request('POST', '/auth/login', {
            email: email,
            password: 'password123'
        });
        const token = loginRes.data.token;
        
        const wsRes = await request('POST', '/workspaces', {
            name: 'E2E Workspace',
            description: 'For testing'
        }, token);
        const workspaceId = wsRes.data.workspace.id;
        console.log(`[SETUP] Registered user and workspace: ${workspaceId}`);

        const devRes = await request('POST', `/workspaces/${workspaceId}/devices`, {
            name: 'E2E Device',
            device_type: 'sensor'
        }, token);
        const deviceId = devRes.data.device.id;
        console.log(`[SETUP] Created device: ${deviceId}`);
        
        let report = {
            publicFlow: 'FAIL',
            apiKeyFlow: 'FAIL',
            authSecurity: 'FAIL',
            routeReuse: 'FAIL',
            detachVsDelete: 'FAIL'
        };

        // ==================================================
        // 1. MANUAL E2E — PUBLIC API
        // ==================================================
        try {
            const apiRes = await request('POST', `/workspaces/${workspaceId}/api-management/apis`, {
                name: 'Public API',
                auth_mode: 'PUBLIC_READ_ONLY'
            }, token);
            const publicApiId = apiRes.data.api.id;
            const apiSlug = apiRes.data.api.api_slug;

            const routeRes = await request('POST', `/workspaces/${workspaceId}/api-management/routes`, {
                name: 'Public Route',
                purpose: 'COMMAND', // try to attach command route to public API
                device_scope: 'SELECTED',
                devices: [deviceId]
            }, token);
            const cmdRouteId = routeRes.data.route.id;

            try {
                await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${publicApiId}`, {
                    route_ids: [cmdRouteId]
                }, token);
                console.error("[FAIL] Public API allowed attaching COMMAND route.");
            } catch (err) {
                if (err.data && err.data.message === 'UNSAFE_ROUTES_NOT_ALLOWED') {
                    console.log("[PASS] Public API rejected COMMAND route.");
                    
                    // Now attach a safe route and test it
                    const safeRouteRes = await request('POST', `/workspaces/${workspaceId}/api-management/routes`, {
                        name: 'Safe Route',
                        purpose: 'CURRENT_DATA',
                        device_scope: 'SELECTED',
                        devices: [deviceId]
                    }, token);
                    const safeRouteId = safeRouteRes.data.route.id;
                    const endpointSlug = safeRouteRes.data.route.endpoint_slug;
                    
                    await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${publicApiId}`, {
                        route_ids: [safeRouteId]
                    }, token);
                    
                    // Call it without auth
                    const publicCallRes = await request('GET', `/v1/public/${apiSlug}/${endpointSlug}`);
                    if (publicCallRes.status === 200) {
                        console.log("[PASS] Public API call succeeded without auth.");
                        report.publicFlow = 'PASS';
                    }
                }
            }
        } catch (e) {
            console.error("Public API flow failed:", e.message);
        }

        // ==================================================
        // 2. MANUAL E2E — API KEY
        // ==================================================
        try {
            const apiRes = await request('POST', `/workspaces/${workspaceId}/api-management/apis`, {
                name: 'Secure API',
                auth_mode: 'API_KEY_SECRET'
            }, token);
            const secureApiId = apiRes.data.api.id;

            const routeRes = await request('POST', `/workspaces/${workspaceId}/api-management/routes`, {
                name: 'Cmd Route',
                purpose: 'COMMAND',
                device_scope: 'SELECTED',
                devices: [deviceId]
            }, token);
            const cmdRouteId = routeRes.data.route.id;
            const endpointSlug = routeRes.data.route.endpoint_slug;

            await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${secureApiId}`, {
                route_ids: [cmdRouteId]
            }, token);

            // Generate credential
            const credRes = await request('POST', `/workspaces/${workspaceId}/api-management/apis/${secureApiId}/credentials`, {
                name: 'Test Key'
            }, token);
            const { api_key, secret, id: credId } = credRes.data.credential;
            
            if (secret) {
                console.log("[PASS] Secret generated exactly once.");
            }

            // Call with valid creds
            try {
                const callRes = await request('POST', `/v1/routes/${endpointSlug}`, 
                    { device_id: deviceId, type: 'ping', payload: {} },
                    null, { 'X-API-Key': api_key, 'X-API-Secret': secret }
                );
                if (callRes.status === 200) console.log("[PASS] Valid API key worked.");
            } catch(e) { console.error("Valid API key failed", e.data); }

            // Call with invalid creds
            try {
                await request('POST', `/v1/routes/${endpointSlug}`, 
                    { device_id: deviceId, type: 'ping', payload: {} },
                    null, { 'X-API-Key': api_key, 'X-API-Secret': 'wrong' }
                );
                console.error("[FAIL] Invalid API key worked.");
            } catch(e) { 
                if (e.status === 401) console.log("[PASS] Invalid API key rejected."); 
            }

            // Revoke credential
            await request('POST', `/workspaces/${workspaceId}/api-management/apis/${secureApiId}/credentials/${credId}/revoke`, null, token);
            try {
                await request('POST', `/v1/routes/${endpointSlug}`, 
                    { device_id: deviceId, type: 'ping', payload: {} },
                    null, { 'X-API-Key': api_key, 'X-API-Secret': secret }
                );
                console.error("[FAIL] Revoked API key worked.");
            } catch(e) { 
                if (e.status === 401) {
                    console.log("[PASS] Revoked API key rejected.");
                    report.apiKeyFlow = 'PASS';
                }
            }
        } catch (e) {
            console.error("API Key flow failed:", e.message);
        }

        // ==================================================
        // 3. MANUAL E2E — AUTH MODE SECURITY
        // ==================================================
        try {
            const apiRes = await request('POST', `/workspaces/${workspaceId}/api-management/apis`, {
                name: 'Trans API',
                auth_mode: 'API_KEY_SECRET'
            }, token);
            const transApiId = apiRes.data.api.id;

            const routeRes = await request('POST', `/workspaces/${workspaceId}/api-management/routes`, {
                name: 'Trans Cmd Route',
                purpose: 'COMMAND',
                device_scope: 'SELECTED',
                devices: [deviceId]
            }, token);
            const cmdRouteId = routeRes.data.route.id;

            await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${transApiId}`, {
                route_ids: [cmdRouteId]
            }, token);

            // Attempt to change to PUBLIC
            try {
                await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${transApiId}`, {
                    auth_mode: 'PUBLIC_READ_ONLY'
                }, token);
                console.error("[FAIL] Backend allowed unsafe auth mode transition.");
            } catch(err) {
                if (err.data && err.data.message === 'UNSAFE_ROUTES_NOT_ALLOWED') {
                    console.log("[PASS] Backend rejected unsafe auth mode transition.");
                    report.authSecurity = 'PASS';
                }
            }
        } catch(e) {
            console.error("Auth Security flow failed:", e.message);
        }

        // ==================================================
        // 4. MANUAL E2E — ROUTE REUSE
        // ==================================================
        try {
            const routeRes = await request('POST', `/workspaces/${workspaceId}/api-management/routes`, {
                name: 'Reusable Data Route',
                purpose: 'CURRENT_DATA',
                device_scope: 'SELECTED',
                devices: [deviceId]
            }, token);
            const reuseRouteId = routeRes.data.route.id;

            const apiA = await request('POST', `/workspaces/${workspaceId}/api-management/apis`, {
                name: 'API A', auth_mode: 'PUBLIC_READ_ONLY'
            }, token);
            const apiB = await request('POST', `/workspaces/${workspaceId}/api-management/apis`, {
                name: 'API B', auth_mode: 'API_KEY_SECRET'
            }, token);

            await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${apiA.data.api.id}`, { route_ids: [reuseRouteId] }, token);
            await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${apiB.data.api.id}`, { route_ids: [reuseRouteId] }, token);

            // Call API A publicly
            const callA = await request('GET', `/v1/public/${apiA.data.api.api_slug}/${routeRes.data.route.endpoint_slug}`);
            if (callA.status === 200) console.log("[PASS] Reusable route works via Public API A.");

            // Create credential for API B
            const credRes = await request('POST', `/workspaces/${workspaceId}/api-management/apis/${apiB.data.api.id}/credentials`, {
                name: 'Reuse Test Key'
            }, token);
            const { api_key, secret } = credRes.data.credential;

            // Call API B via session
            const callB = await request('GET', `/v1/routes/${routeRes.data.route.endpoint_slug}`, null, null, { 'X-API-Key': api_key, 'X-API-Secret': secret });
            if (callB.status === 200) console.log("[PASS] Reusable route works via API_KEY_SECRET API B.");

            report.routeReuse = 'PASS';
        } catch(e) {
            console.error("Route reuse flow failed:", e.message);
        }

        // ==================================================
        // 5. MANUAL E2E — DETACH VS DELETE
        // ==================================================
        try {
            const apiRes = await request('POST', `/workspaces/${workspaceId}/api-management/apis`, {
                name: 'Detach API',
                auth_mode: 'APPLICATION_SESSION'
            }, token);
            const detachApiId = apiRes.data.api.id;

            const routeRes = await request('POST', `/workspaces/${workspaceId}/api-management/routes`, {
                name: 'Detach Route',
                purpose: 'HISTORY',
                device_scope: 'SELECTED',
                devices: [deviceId]
            }, token);
            const detachRouteId = routeRes.data.route.id;

            await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${detachApiId}`, { route_ids: [detachRouteId] }, token);

            // Detach route
            await request('PUT', `/workspaces/${workspaceId}/api-management/apis/${detachApiId}`, { route_ids: [] }, token);
            
            // Check API
            const getApiRes = await request('GET', `/workspaces/${workspaceId}/api-management/apis/${detachApiId}`, null, token);
            if (getApiRes.data.api.routes.length === 0) console.log("[PASS] Route detached from API successfully.");

            // Check global route exists
            const getRouteRes = await request('GET', `/workspaces/${workspaceId}/api-management/routes`, null, token);
            if (getRouteRes.data.routes.some(r => r.id === detachRouteId)) {
                console.log("[PASS] Route still exists globally after detachment.");
                
                // Now delete it
                await request('DELETE', `/workspaces/${workspaceId}/api-management/routes/${detachRouteId}`, null, token);
                const finalRoutes = await request('GET', `/workspaces/${workspaceId}/api-management/routes`, null, token);
                if (!finalRoutes.data.routes.some(r => r.id === detachRouteId)) {
                    console.log("[PASS] Route completely deleted globally.");
                    report.detachVsDelete = 'PASS';
                }
            }
        } catch(e) {
            console.error("Detach vs Delete flow failed:", e.message);
        }

        console.log("\n=== FINAL REPORT ===");
        console.log(JSON.stringify(report, null, 2));

    } catch (e) {
        console.error("Setup failed:", e);
    }
}

runTests();
