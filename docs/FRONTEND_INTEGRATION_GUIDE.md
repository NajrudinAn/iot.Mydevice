# Custom Frontend Integration Guide

This guide explains how to build a custom HTML/JavaScript frontend dashboard that connects to your MyDevice backend. Once your hardware script (using `mydevice.py`) is successfully sending telemetry and listening for commands, you can build completely custom UIs to visualize the data and control your devices in real-time.

---

## 🤖 AI-Assisted Frontend Generation (ChatGPT / Claude)
If you want to generate a frontend quickly using AI, copy the highly detailed prompt below, replace `YOUR_ROUTE` and `YOUR_TOKEN`, and paste it into ChatGPT or Claude along with your desired design (e.g., "Make it look like a sci-fi dashboard using TailwindCSS").

```text
I want to build a custom HTML/JS frontend dashboard for my IoT devices. 
Please generate a single HTML file containing the UI and the JavaScript logic.

IMPORTANT PLATFORM RULES:
1. Real-time data is streamed via Server-Sent Events (SSE) from the backend.
2. Commands are sent via standard REST POST requests.
3. The UI must be fully reactive and dynamically update when new SSE data arrives.
4. I want an Optimistic UI: when a user toggles a switch, update the UI instantly, then send the API request.

MY API DETAILS:
- Telemetry SSE Route: http://localhost:5001/api/v1/routes/realtime-123456
- Command POST Route: http://localhost:5001/api/v1/routes/command-123456
- History GET Route: http://localhost:5001/api/v1/routes/history-123456
- Current Data GET Route: http://localhost:5001/api/v1/routes/current-123456
- Authorization Header: "Bearer YOUR_TOKEN"

JAVASCRIPT REQUIREMENTS:
- Create an `async function connectSSE()` using the `fetch` API and `ReadableStream`.
- Parse the SSE chunks (separated by `\n\n`) and handle `event: device_data`.
- Parse the `data: {...}` payload. The hardware data is located in `JSON.parse(dataStr).payload`.
- Use a `try/catch` block and `setTimeout` to automatically reconnect if the stream disconnects.
- Create an `async function sendCommand(propertyName, newValue)` that sends a POST request with `body: JSON.stringify({ type: \`SET_\${propertyName.toUpperCase()}\`, payload: { [propertyName]: newValue } })`.
- Create an `async function fetchHistory()` that fetches historical time-series data using `?limit=100` and renders a chart using Chart.js.

Please provide a beautiful, modern UI using TailwindCSS via CDN that includes:
- A card displaying "temperature" and "humidity".
- A toggle switch for "main_light" (which triggers sendCommand).
```

---

## 1. The Architecture (How it Works)

The MyDevice platform uses a modern, ultra-fast real-time architecture:
1. **Hardware Device** runs the `mydevice.py` SDK and continuously sends small JSON payloads over MQTT to the backend.
2. **The Backend** parses these messages, checks your API Route permissions, and buffers the latest state of the device.
3. **Your HTML/JS Dashboard** opens a persistent connection to the Backend using **Server-Sent Events (SSE)**.
4. Whenever the hardware device sends an update, the backend instantly pushes the new values down the SSE stream directly to your Javascript, without you ever having to refresh the page.

---

## 2. Setting Up Real-Time Data (SSE)

To get live data from your device, you need to connect to the backend's telemetry endpoint. We recommend using standard JavaScript `fetch` with the `ReadableStream` API. This allows you to smoothly read the SSE chunks.

### A. The JavaScript Connection Code
Include this function in your application. It handles connecting, parsing the stream, and auto-reconnecting if the network drops.

```javascript
// Global state tracking
const streams = []; // Used to cleanly abort connections on logout
let appStateCache = {}; // Used to store the latest known values

async function connectSSE(route, authToken, callback) {
    const controller = new AbortController();
    streams.push(controller);

    try {
        const res = await fetch(`http://localhost:5001${route}`, {
            headers: { 
                'Authorization': `Bearer ${authToken}`, 
                'Accept': 'text/event-stream' 
            },
            signal: controller.signal
        });
        
        if (!res.ok) throw new Error("SSE connection failed");

        console.log("Connected to Real-time Stream!");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n'); // SSE messages are separated by blank lines
            buffer = chunks.pop(); // Keep incomplete chunks in the buffer

            for (const chunk of chunks) {
                let eventType = 'message', dataStr = null;
                
                // Parse the SSE chunk lines
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('event: ')) eventType = line.slice(7).trim();
                    else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
                }
                
                if (dataStr) {
                    const parsedData = JSON.parse(dataStr);
                    
                    if (eventType === 'device_data') {
                        // This event contains actual hardware data (temperature, light_status, etc.)
                        const payload = parsedData.payload;
                        
                        // Save to cache so we can restore UI on page refresh
                        appStateCache = { ...appStateCache, ...payload };
                        
                        // Fire your custom UI update function
                        callback(payload);
                        
                    } else if (eventType === 'device_status') {
                        // This event fires when a device goes ONLINE or OFFLINE
                        console.log(`Device ${parsedData.deviceId} is now ${parsedData.status}`);
                    }
                }
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Connection lost. Reconnecting in 3 seconds...");
            setTimeout(() => connectSSE(route, authToken, callback), 3000);
        }
    }
}
```

### B. Updating Your HTML
Create a simple HTML structure with specific `id` attributes so your JavaScript can easily find and update them.

```html
<div class="card">
    <h2>Temperature</h2>
    <p><span id="val-temp">--</span> °C</p>
</div>

<div class="card">
    <h2>Main Light</h2>
    <input type="checkbox" id="toggle-mlight" onchange="sendCommand('main_light', this.checked)">
</div>
```

### C. Processing the Data
Create a function that takes the `payload` object and updates the DOM elements. 
**Important Note:** Always check if the HTML element actually exists before trying to update it, to prevent fatal JavaScript crashes.

```javascript
function updateUI(data) {
    if (!data) return;
    
    // Update text fields
    if (data.temperature !== undefined && document.getElementById('val-temp')) {
        document.getElementById('val-temp').innerText = data.temperature;
    }
    
    // Update toggles/checkboxes
    if (data.main_light !== undefined && document.getElementById('toggle-mlight')) {
        // Only update the toggle if the user isn't currently interacting with it
        if (document.activeElement !== document.getElementById('toggle-mlight')) {
            document.getElementById('toggle-mlight').checked = data.main_light;
        }
    }
}

// Start the connection! (Make sure to replace with your actual route and token)
connectSSE('/api/v1/routes/realtime-123456', 'your_jwt_token', updateUI);
```

## 3. Fetching Historical & Current Data (REST APIs)

While SSE is perfect for real-time updates, you will often need to retrieve historical data for charts or fetch the last known state immediately when the dashboard loads. The MyDevice platform allows you to create specific API Routes for these purposes.

All data endpoints require the `Authorization: Bearer <TOKEN>` header.

### A. Current Data (Last Known State)
Retrieves the most recent data payload for your devices. This is great for initializing your UI state before the SSE stream connects.

```javascript
async function fetchCurrentData() {
    const res = await fetch('http://localhost:5001/api/v1/routes/YOUR_CURRENT_DATA_ROUTE', {
        headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
    });
    const json = await res.json();
    
    // Returns an array of devices:
    // [ { device_id: "...", recorded_at: "...", payload: { temp: 23, main_light: true } } ]
    if (json.success && json.data.length > 0) {
        updateUI(json.data[0].payload);
    }
}
```

### B. Historical Data (Charts & Graphs)
Retrieves time-series data. You can filter by `device_id`, `start_date`, `end_date`, `limit`, and `page`.

```javascript
async function fetchHistory(deviceId, startDate, endDate) {
    const query = new URLSearchParams({
        device_id: deviceId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 100 // default 500, max 1000
    });
    
    const res = await fetch(\`http://localhost:5001/api/v1/routes/YOUR_HISTORY_ROUTE?\${query}\`, {
        headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
    });
    const json = await res.json();
    
    // Returns paginated historical data:
    // { success: true, data: [...], pagination: { total, page, limit, totalPages } }
    if (json.success) {
        renderChart(json.data);
    }
}
```

### C. Device Status (Online/Offline)
Retrieves the current network connectivity status of your devices.

```javascript
async function fetchDeviceStatus() {
    const res = await fetch('http://localhost:5001/api/v1/routes/YOUR_STATUS_ROUTE', {
        headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
    });
    const json = await res.json();
    
    // Returns: [ { device_id: "...", status: "ONLINE", last_seen: "..." } ]
    if (json.success) {
        console.log("Device Status:", json.data);
    }
}
```

---

## 4. Sending Commands to Devices

When you define a writable property in your Python SDK (e.g. `device.add_switch("main_light")`), the backend automatically creates a command endpoint for it.

To send a command, you just perform a standard POST request.

### A. The Command Function
We highly recommend using an **Optimistic UI Update** pattern. This means you instantly update the UI visually as soon as the user clicks the button, and then send the request to the server in the background. This makes your dashboard feel incredibly fast.

```javascript
async function sendCommand(property_name, new_value) {
    // 1. Optimistic Update (Instantly update the UI)
    const updateObj = { [property_name]: new_value };
    updateUI(updateObj); 
    
    // 2. Send request to server
    try {
        const response = await fetch(`http://localhost:5001/api/v1/routes/command-123456`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer your_jwt_token` 
            },
            body: JSON.stringify({ 
                type: `SET_${property_name.toUpperCase()}`, // e.g. SET_MAIN_LIGHT
                payload: updateObj // e.g. { main_light: true }
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Command failed');
        }
        
    } catch (error) {
        console.error("Command failed:", error);
        alert("Failed to update device. The state will revert shortly.");
        // The SSE stream will automatically push the correct, un-modified state 
        // back down to the client on the next heartbeat.
    }
}
```

---

## 4. Tips for Production Apps

1. **Caching State**: If you want your dashboard to load instantly when the user refreshes the page, save `appStateCache` to `localStorage` every time `updateUI` runs. Then, call `updateUI(JSON.parse(localStorage.getItem('cache')))` immediately when the page loads, before you even open the SSE connection.
2. **Missing Properties**: If your UI has a button (e.g. "Front Door Lock"), but you notice the state resets every time you refresh the page, check your **API Route Data Permissions** in the main dashboard. If you didn't grant the API Route permission to read the `door_lock` field, the backend will strictly filter it out of the SSE payload!
3. **Graceful Disconnects**: If you build a login/logout system, be sure to loop through `streams` and call `controller.abort()` when logging out to prevent multiple duplicate SSE connections in the background.
