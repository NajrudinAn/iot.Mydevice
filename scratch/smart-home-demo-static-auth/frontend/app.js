// Hardcode your static API credentials here for the demo
const APP_KEY = 'app_5b09d6196cd3a12941461c4072e5d170';
const APP_SECRET = '2c798a8c2362c09ee2c0597cb22c2a35f8ff9ba028a6a0f661a5cf8daa4ccc66';

let streamAbortController = null;

// The platform injects these variables if this is hosted natively.
const PLATFORM_BASE_URL = window.PLATFORM_BASE_URL || 'http://localhost:3000';

// Placeholder API routes - configure these in the platform!
const ROUTES = {
    telemetry: '/api/v1/routes/realtime-506320',
    commands: '/api/v1/routes/comand-test-94d621'
};

function getAuthHeaders() {
    if (APP_KEY.startsWith('app_')) {
        return {
            'X-App-Key': APP_KEY,
            'X-App-Secret': APP_SECRET
        };
    }
    return {
        'X-Api-Key': APP_KEY,
        'X-Api-Secret': APP_SECRET
    };
}

const ui = {
    views: {
        dashboard: document.getElementById('dashboard-view')
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

// No login logic needed in static auth version

async function startTelemetryStream() {
    ui.dashboard.status.textContent = 'Connecting...';
    ui.dashboard.status.className = 'status-badge connecting';

    if (streamAbortController) streamAbortController.abort();
    streamAbortController = new AbortController();

    try {
        const response = await fetch(`${PLATFORM_BASE_URL}${ROUTES.telemetry}`, {
            headers: {
                ...getAuthHeaders(),
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
                ...getAuthHeaders()
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

// Start directly on load
document.addEventListener('DOMContentLoaded', () => {
    if (APP_KEY === 'YOUR_APP_KEY_HERE') {
        alert('Please configure APP_KEY and APP_SECRET in app.js!');
        return;
    }
    showView('dashboard');
    startTelemetryStream();
});
