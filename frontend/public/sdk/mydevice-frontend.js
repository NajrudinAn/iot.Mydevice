class MyDeviceFrontend {
    constructor(config) {
        if (!config.token) throw new Error("MyDeviceFrontend: Missing authorization token");
        
        this.token = config.token;
        this.baseUrl = config.baseUrl || 'https://mydevice.in';
        this.telemetryRoute = config.telemetryRoute;
        this.commandRoute = config.commandRoute;
        
        this.onDataCallback = null;
        this.onStatusCallback = null;
        this.stateCache = {};
        
        this.streams = [];
        this._setupAutoDisconnect();
    }

    /**
     * Authenticate a user and retrieve a JWT token.
     */
    static async login(email, password, appId, baseUrl = 'https://mydevice.in') {
        const res = await fetch(`${baseUrl}/api/applications/${appId}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        return data.token;
    }

    /**
     * Register a new user account.
     */
    static async signup(email, password, appId, deviceId = null, baseUrl = 'https://mydevice.in') {
        const payload = { email, password };
        if (deviceId) payload.deviceId = deviceId;
        
        const res = await fetch(`${baseUrl}/api/applications/${appId}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Signup failed');
        return data.token;
    }

    _setupAutoDisconnect() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.streams.forEach(s => s.abort());
                this.streams = [];
                if (this.onStatusCallback) this.onStatusCallback({ status: 'PAUSED_HIDDEN' });
            } else {
                if (this.streams.length === 0 && this.telemetryRoute) {
                    this.connectRealtime();
                }
            }
        });
    }

    onData(callback) {
        this.onDataCallback = callback;
    }

    onStatus(callback) {
        this.onStatusCallback = callback;
    }

    async connectRealtime() {
        if (!this.telemetryRoute) return;
        
        const controller = new AbortController();
        this.streams.push(controller);

        try {
            const res = await fetch(`${this.baseUrl}${this.telemetryRoute}`, {
                headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'text/event-stream' },
                signal: controller.signal
            });

            if (!res.ok) throw new Error("SSE connection failed");
            if (this.onStatusCallback) this.onStatusCallback({ status: 'CONNECTED' });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop();

                for (const chunk of chunks) {
                    let eventType = 'message', dataStr = null;
                    for (const line of chunk.split('\n')) {
                        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
                        else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
                    }
                    
                    if (dataStr) {
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (eventType === 'device_data') {
                                this.stateCache = { ...this.stateCache, ...parsed.payload };
                                if (this.onDataCallback) this.onDataCallback(parsed.payload, parsed.deviceId);
                            } else if (eventType === 'device_status') {
                                if (this.onStatusCallback) this.onStatusCallback(parsed);
                            }
                        } catch (e) {
                            console.error("MyDeviceFrontend Parse Error:", e);
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                if (this.onStatusCallback) this.onStatusCallback({ status: 'RECONNECTING' });
                setTimeout(() => this.connectRealtime(), 3000);
            }
        }
    }

    async sendCommand(type, payload, deviceId = null) {
        if (!this.commandRoute) throw new Error("commandRoute not provided");

        // Optimistic cache update if payload is an object
        let previousState = null;
        if (typeof payload === 'object' && payload !== null) {
            previousState = { ...this.stateCache };
            this.stateCache = { ...this.stateCache, ...payload };
            if (this.onDataCallback) this.onDataCallback(payload, deviceId || 'optimistic');
        }

        try {
            const bodyObj = { type, payload };
            if (deviceId) bodyObj.device_id = deviceId; // Required for multi-device routes

            const response = await fetch(`${this.baseUrl}${this.commandRoute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify(bodyObj)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Command failed');
            }
            return true;
        } catch (err) {
            console.error("MyDeviceFrontend Command Error:", err);
            // Revert optimistic update
            if (previousState !== null) {
                this.stateCache = previousState;
                if (this.onDataCallback) this.onDataCallback(this.stateCache, deviceId || 'revert');
            }
            throw err;
        }
    }
}

// Attach to window for CDN/script tag usage
if (typeof window !== 'undefined') {
    window.MyDeviceFrontend = MyDeviceFrontend;
}
