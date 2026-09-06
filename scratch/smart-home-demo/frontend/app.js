let authToken = null;
let streamAbortController = null;

// The platform injects these variables if this is hosted natively.
const PLATFORM_BASE_URL = window.PLATFORM_BASE_URL || 'http://localhost:3000';
const PLATFORM_APP_ID = window.PLATFORM_APP_ID || 'dummy-app-id';

// Placeholder API routes - configure these in the platform!
const ROUTES = {
    telemetry: '/api/v1/routes/realtime-506320',
    commands: '/api/v1/routes/comand-test-94d621'
};

const ui = {
    views: {
        auth: document.getElementById('auth-view'),
        signup: document.getElementById('signup-view'),
        forgot: document.getElementById('forgot-view'),
        dashboard: document.getElementById('dashboard-view')
    },
    login: {
        form: document.getElementById('login-form'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        btn: document.getElementById('loginBtn'),
        error: document.getElementById('loginError')
    },
    signup: {
        form: document.getElementById('signup-form'),
        name: document.getElementById('signup-name'),
        email: document.getElementById('signup-email'),
        password: document.getElementById('signup-password'),
        btn: document.getElementById('signupBtn'),
        error: document.getElementById('signupError')
    },
    forgot: {
        form: document.getElementById('forgot-form'),
        email: document.getElementById('forgot-email'),
        btn: document.getElementById('forgotBtn'),
        error: document.getElementById('forgotError')
    },
    dashboard: {
        temp: document.getElementById('temp-val'),
        hum: document.getElementById('hum-val'),
        lightToggle: document.getElementById('lightToggle'),
        fanSlider: document.getElementById('fanSlider'),
        fanIcon: document.getElementById('fan-icon'),
        status: document.getElementById('connection-status'),
        log: document.getElementById('event-log'),
        logoutBtn: document.getElementById('logoutBtn')
    }
};

function addLog(message, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    ui.dashboard.log.appendChild(entry);
    ui.dashboard.log.scrollTop = ui.dashboard.log.scrollHeight;
}

function showView(viewName) {
    const target = ui.views[viewName];

    Object.values(ui.views).forEach(v => {
        if (v === target) return; // Don't hide the view we're about to show
        v.classList.remove('active');
        setTimeout(() => v.classList.add('hidden'), 400);
    });

    target.classList.remove('hidden');
    // Small delay to allow display:block to apply before animating opacity
    setTimeout(() => target.classList.add('active'), 50);
}

// --- View Navigation ---
document.getElementById('showSignupLink').addEventListener('click', (e) => {
    e.preventDefault();
    showView('signup');
});
document.getElementById('showForgotLink').addEventListener('click', (e) => {
    e.preventDefault();
    showView('forgot');
});
document.getElementById('showLoginFromSignup').addEventListener('click', (e) => {
    e.preventDefault();
    showView('auth');
});
document.getElementById('showLoginFromForgot').addEventListener('click', (e) => {
    e.preventDefault();
    showView('auth');
});

// --- Auth Handling ---
ui.login.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.login.btn.disabled = true;
    ui.login.btn.textContent = 'Authenticating...';
    ui.login.error.classList.add('hidden');

    try {
        const res = await fetch(`${PLATFORM_BASE_URL}/api/applications/${PLATFORM_APP_ID}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ui.login.email.value,
                password: ui.login.password.value
            })
        });

        const data = await res.json();
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('smartHomeAuthToken', data.token);
            showView('dashboard');
            startTelemetryStream();
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (err) {
        ui.login.error.textContent = err.message;
        ui.login.error.classList.remove('hidden');
    } finally {
        ui.login.btn.disabled = false;
        ui.login.btn.textContent = 'Authenticate';
    }
});

ui.signup.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.signup.btn.disabled = true;
    ui.signup.btn.textContent = 'Registering...';
    ui.signup.error.classList.add('hidden');
    ui.signup.error.className = 'error-msg hidden'; // reset to default

    try {
        const res = await fetch(`${PLATFORM_BASE_URL}/api/applications/${PLATFORM_APP_ID}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: ui.signup.name.value,
                email: ui.signup.email.value,
                password: ui.signup.password.value
            })
        });

        const data = await res.json();
        if (data.success) {
            ui.signup.error.className = 'error-msg success-msg';
            ui.signup.error.textContent = data.message || 'Registration successful! You can now login.';
            ui.signup.error.classList.remove('hidden');
            setTimeout(() => showView('auth'), 2000);
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (err) {
        ui.signup.error.textContent = err.message;
        ui.signup.error.classList.remove('hidden');
    } finally {
        ui.signup.btn.disabled = false;
        ui.signup.btn.textContent = 'Register';
    }
});

ui.forgot.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.forgot.btn.disabled = true;
    ui.forgot.btn.textContent = 'Sending...';
    ui.forgot.error.classList.add('hidden');
    ui.forgot.error.className = 'error-msg hidden'; // reset to default

    try {
        const res = await fetch(`${PLATFORM_BASE_URL}/api/applications/${PLATFORM_APP_ID}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ui.forgot.email.value
            })
        });

        const data = await res.json();
        if (data.success) {
            ui.forgot.error.className = 'error-msg success-msg';
            ui.forgot.error.textContent = data.message || 'If that email exists, a password reset link has been sent.';
            ui.forgot.error.classList.remove('hidden');
        } else {
            throw new Error(data.message || 'Request failed');
        }
    } catch (err) {
        ui.forgot.error.textContent = err.message;
        ui.forgot.error.classList.remove('hidden');
    } finally {
        ui.forgot.btn.disabled = false;
        ui.forgot.btn.textContent = 'Send Reset Link';
    }
});

ui.dashboard.logoutBtn.addEventListener('click', () => {
    if (streamAbortController) {
        streamAbortController.abort();
    }
    authToken = null;
    localStorage.removeItem('smartHomeAuthToken');
    showView('auth');
    addLog('Logged out.', 'system');
});

async function startTelemetryStream() {
    ui.dashboard.status.textContent = 'Connecting...';
    ui.dashboard.status.className = 'status-badge connecting';

    if (streamAbortController) streamAbortController.abort();
    streamAbortController = new AbortController();

    try {
        const response = await fetch(`${PLATFORM_BASE_URL}${ROUTES.telemetry}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'text/event-stream'
            },
            signal: streamAbortController.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        ui.dashboard.status.textContent = 'Connected';
        ui.dashboard.status.className = 'status-badge connected';
        addLog('Connected to Realtime Telemetry Stream', 'system');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop(); // Keep incomplete chunk

            for (const chunk of chunks) {
                // Parse SSE event type and data
                let eventType = 'message';
                let dataStr = null;

                for (const line of chunk.split('\n')) {
                    if (line.startsWith('event: ')) {
                        eventType = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        dataStr = line.slice(6).trim();
                    }
                }

                if (!dataStr || dataStr === 'heartbeat') continue;

                // Only process telemetry data events
                if (eventType === 'device_data') {
                    try {
                        const data = JSON.parse(dataStr);
                        updateDashboard(data);
                    } catch (e) {
                        console.error('Error parsing SSE data', e);
                    }
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        ui.dashboard.status.textContent = 'Disconnected';
        ui.dashboard.status.className = 'status-badge error';
        addLog(`Stream error: ${err.message}`, 'error');

        // Auto-reconnect after 3 seconds
        setTimeout(startTelemetryStream, 3000);
    }
}

function updateDashboard(data) {
    // SSE realtime sends { payload: {...} } (filtered fields)
    const telemetry = data.payload;
    if (!telemetry) return;
    addLog(`Received telemetry update`, 'incoming');

    if (telemetry.temperature !== undefined) {
        ui.dashboard.temp.textContent = `${telemetry.temperature} °C`;
    }
    if (telemetry.humidity !== undefined) {
        ui.dashboard.hum.textContent = `${telemetry.humidity} %`;
    }

    // Don't update actuators if user is actively interacting (to prevent jitter)
    if (telemetry.light_status !== undefined && document.activeElement !== ui.dashboard.lightToggle) {
        ui.dashboard.lightToggle.checked = telemetry.light_status;
    }

    if (telemetry.fan_speed !== undefined && document.activeElement !== ui.dashboard.fanSlider) {
        ui.dashboard.fanSlider.value = telemetry.fan_speed;
        // visual rotation speed
        const speeds = [0, 1, 2, 4]; // rotations per second approximation
        const speed = speeds[telemetry.fan_speed];
        if (speed === 0) {
            ui.dashboard.fanIcon.style.animation = 'none';
        } else {
            ui.dashboard.fanIcon.style.animation = `spin ${1 / speed}s linear infinite`;
        }
    }
}

// Add keyframes dynamically for the fan spin
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin { 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// Command Sending
async function sendCommand(command, payload) {
    addLog(`Sending command: ${command} → ${JSON.stringify(payload)}`, 'outgoing');
    try {
        const response = await fetch(`${PLATFORM_BASE_URL}${ROUTES.commands}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            // Platform expects: { type, payload } NOT { command, payload }
            body: JSON.stringify({
                type: command,
                payload: payload
            })
        });

        const data = await response.json();
        if (data.success) {
            addLog(`Command successful`, 'system');
        } else {
            addLog(`Command failed: ${data.error?.message || 'Unknown error'}`, 'error');
        }
    } catch (err) {
        addLog(`Command network error`, 'error');
    }
}

ui.dashboard.lightToggle.addEventListener('change', (e) => {
    sendCommand('SET_LIGHT', { status: e.target.checked });
});

ui.dashboard.fanSlider.addEventListener('change', (e) => {
    sendCommand('SET_FAN_SPEED', { speed: parseInt(e.target.value, 10) });
});

// Auto-login on load if token exists
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('smartHomeAuthToken');
    if (savedToken) {
        authToken = savedToken;
        showView('dashboard');
        startTelemetryStream();
    }
});
