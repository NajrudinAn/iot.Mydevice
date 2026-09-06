let authToken = null;
let streamAbortController = null;

// UI Elements
const ui = {
    views: {
        auth: document.getElementById('auth-view'),
        dashboard: document.getElementById('dashboard-view')
    },
    inputs: {
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        commandType: document.getElementById('commandType'),
        commandPayload: document.getElementById('commandPayload')
    },
    buttons: {
        login: document.getElementById('loginBtn'),
        logout: document.getElementById('logoutBtn'),
        fetchData: document.getElementById('fetchDataBtn'),
        sendCommand: document.getElementById('sendCommandBtn'),
        connectStream: document.getElementById('connectStreamBtn'),
        disconnectStream: document.getElementById('disconnectStreamBtn')
    },
    status: {
        loginError: document.getElementById('loginError'),
        data: document.getElementById('dataStatus'),
        command: document.getElementById('commandStatus'),
        stream: document.getElementById('streamStatus')
    },
    outputs: {
        data: document.getElementById('dataOutput'),
        stream: document.getElementById('streamOutput')
    }
};

// API Endpoints Config
const routes = {
    currentData: '/api/v1/routes/test-working-cad9d9',
    command: '/api/v1/routes/testing-command-api-175aec',
    realtime: '/api/v1/routes/testing-the-realtime-3725da'
};

// Functions
function showView(viewName) {
    Object.values(ui.views).forEach(v => v.classList.remove('active'));
    Object.values(ui.views).forEach(v => v.classList.add('hidden'));
    ui.views[viewName].classList.remove('hidden');
    ui.views[viewName].classList.add('active');
}

async function login() {
    ui.buttons.login.disabled = true;
    ui.status.loginError.classList.add('hidden');
    
    const baseUrl = window.PLATFORM_BASE_URL || 'http://localhost:3000';
    const appId = window.PLATFORM_APP_ID || '33720bb8-579c-44c3-895b-4adb2341b4c8';
    
    try {
        const response = await fetch(`${baseUrl}/api/applications/${appId}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ui.inputs.email.value,
                password: ui.inputs.password.value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            showView('dashboard');
        } else {
            ui.status.loginError.textContent = data.message || 'Login failed';
            ui.status.loginError.classList.remove('hidden');
        }
    } catch (e) {
        ui.status.loginError.textContent = 'Network error during login';
        ui.status.loginError.classList.remove('hidden');
    } finally {
        ui.buttons.login.disabled = false;
    }
}

function logout() {
    authToken = null;
    disconnectStream();
    showView('auth');
}

async function fetchData() {
    ui.status.data.textContent = 'Fetching...';
    ui.outputs.data.textContent = '';
    
    const baseUrl = window.PLATFORM_BASE_URL || 'http://localhost:3000';
    try {
        const response = await fetch(`${baseUrl}${routes.currentData}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        ui.outputs.data.textContent = JSON.stringify(data, null, 2);
        ui.status.data.textContent = `Status: ${response.status}`;
    } catch (e) {
        ui.status.data.textContent = `Error: ${e.message}`;
    }
}

async function sendCommand() {
    ui.status.command.textContent = 'Sending...';
    
    try {
        const payloadStr = ui.inputs.commandPayload.value;
        const payload = JSON.parse(payloadStr);
        const baseUrl = window.PLATFORM_BASE_URL || 'http://localhost:3000';
        
        const response = await fetch(`${baseUrl}${routes.command}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: ui.inputs.commandType.value,
                payload: payload
            })
        });
        const data = await response.json();
        ui.status.command.textContent = `Status: ${response.status} - ${JSON.stringify(data)}`;
    } catch (e) {
        ui.status.command.textContent = `Error: ${e.message}`;
    }
}

function logStreamEvent(text, isError = false) {
    const entry = document.createElement('div');
    entry.className = 'stream-entry';
    if (isError) entry.style.color = 'var(--error)';
    
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="stream-time">[${time}]</span> ${text}`;
    
    ui.outputs.stream.appendChild(entry);
    ui.outputs.stream.scrollTop = ui.outputs.stream.scrollHeight;
}

async function connectStream() {
    if (streamAbortController) disconnectStream();
    
    streamAbortController = new AbortController();
    ui.buttons.connectStream.classList.add('hidden');
    ui.buttons.disconnectStream.classList.remove('hidden');
    ui.status.stream.textContent = 'Connecting...';
    ui.outputs.stream.innerHTML = '';
    
    const baseUrl = window.PLATFORM_BASE_URL || 'http://localhost:3000';
    try {
        const response = await fetch(`${baseUrl}${routes.realtime}`, {
            headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'text/event-stream' },
            signal: streamAbortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        ui.status.stream.textContent = 'Connected & Listening';
        logStreamEvent('Connected successfully');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE lines are separated by \n\n
            const lines = buffer.split('\n\n');
            buffer = lines.pop(); // Keep the last incomplete part in the buffer
            
            for (const block of lines) {
                if (!block.trim()) continue;
                
                // Parse basic SSE block
                let eventType = 'message';
                let eventData = '';
                
                block.split('\n').forEach(line => {
                    if (line.startsWith('event:')) eventType = line.substring(6).trim();
                    else if (line.startsWith('data:')) eventData += line.substring(5).trim();
                });
                
                if (eventData) {
                    try {
                        // Format JSON if possible
                        const parsed = JSON.parse(eventData);
                        logStreamEvent(`<strong>${eventType}</strong>: <pre style="margin:0;font-size:12px;">${JSON.stringify(parsed, null, 2)}</pre>`);
                    } catch {
                        logStreamEvent(`<strong>${eventType}</strong>: ${eventData}`);
                    }
                } else {
                    logStreamEvent(`<em>Keep-alive ping</em>`);
                }
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            logStreamEvent('Connection aborted by user');
        } else {
            logStreamEvent(`Connection error: ${e.message}`, true);
        }
    } finally {
        ui.buttons.connectStream.classList.remove('hidden');
        ui.buttons.disconnectStream.classList.add('hidden');
        ui.status.stream.textContent = 'Disconnected';
        streamAbortController = null;
    }
}

function disconnectStream() {
    if (streamAbortController) {
        streamAbortController.abort();
    }
}

// Event Listeners
ui.buttons.login.addEventListener('click', login);
ui.buttons.logout.addEventListener('click', logout);
ui.buttons.fetchData.addEventListener('click', fetchData);
ui.buttons.sendCommand.addEventListener('click', sendCommand);
ui.buttons.connectStream.addEventListener('click', connectStream);
ui.buttons.disconnectStream.addEventListener('click', disconnectStream);
