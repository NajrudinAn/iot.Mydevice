import React, { useState } from 'react';
import { Copy, CheckCircle2, Download, Terminal, Settings2, Code, Cpu, Bot, FileCode2, Info, ChevronRight, Hash, Type, AlignLeft, List, LayoutDashboard } from 'lucide-react';

const WorkspaceSdkDocs = () => {
    const [activeTab, setActiveTab] = useState('python');
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const hardwareAiPrompt = `I am using the MyDevice IoT Platform SDK to connect my hardware to a cloud dashboard. 
Please integrate this SDK into my existing code.

IMPORTANT RULES:
1. Do NOT break my existing device functionality (motor control, display logic, etc.). 
2. Only add the code needed to send telemetry data and receive commands via the SDK.
3. My Device ID is "YOUR_DEVICE_ID" and Secret Key is "YOUR_SECRET_KEY".

SDK CAPABILITIES & FULL API REFERENCE:
The SDK uses a "Blueprint API". You define properties and actions, and the cloud auto-generates the UI.

1. INITIALIZATION:
   - Python: \`device = MyDevice("ID", "SECRET")\`
   - Node.js: \`const device = new MyDevice('ID', 'SECRET')\`
   - Arduino: \`MyDevice device("ID", "SECRET", wifiClient)\`

2. READ-ONLY TELEMETRY (Sensors, Status):
   - \`add_reading(name, label, data_type="number", unit="")\`
     Example: \`device.add_reading("temp", "Temperature", "number", "°C")\`

3. CONTROLLABLE COMPONENTS (Auto-generates Dashboard UI):
   - \`add_switch(name, label, on_change_callback)\`
     Creates a toggle. Callback receives a boolean.
   - \`add_slider(name, label, min_val, max_val, on_change_callback)\`
     Creates a slider. Callback receives a float/number.
   - \`add_property(name, label, type, unit, min, max, options, writable, on_change)\`
     Advanced generic property (e.g., string dropdowns if options=["A", "B"]).

4. STATELESS ACTIONS (Buttons/Commands):
   - \`add_action(name, label, description, parameters_dict, on_execute_callback)\`
     Creates a clickable button on the dashboard that triggers the callback.

5. SENDING DATA:
   - \`send(name, value)\` or \`update_property(name, value)\`
     Push sensor data in your main loop. The SDK automatically deduplicates traffic.

6. CONNECTION:
   - Python/Node: Call \`device.connect()\` once.
   - Arduino: Call \`device.begin()\` in setup(), and \`device.loop()\` constantly in loop().

Please analyze my code and provide the exact snippets to add. Provide full, copy-pastable code.`;

    const frontendAiPrompt = `I want to build a custom HTML/JS frontend dashboard for my IoT devices. 
Please generate a single HTML file containing the UI and the JavaScript logic.

IMPORTANT PLATFORM RULES:
1. Real-time data is streamed via Server-Sent Events (SSE) from the backend.
2. Commands are sent via standard REST POST requests.
3. The UI must be fully reactive and dynamically update when new SSE data arrives.
4. I want an Optimistic UI: when a user toggles a switch, update the UI instantly, then send the API request.

MY API DETAILS:
- Telemetry SSE Route: http://localhost:5001/api/v1/routes/YOUR_ROUTE_ID
- Command POST Route: http://localhost:5001/api/v1/routes/YOUR_ROUTE_ID
- History GET Route: http://localhost:5001/api/v1/routes/YOUR_ROUTE_ID
- Current Data GET Route: http://localhost:5001/api/v1/routes/YOUR_ROUTE_ID
- Authorization Header: "Bearer YOUR_TOKEN"

JAVASCRIPT REQUIREMENTS:
- Create an \`async function connectSSE()\` using the \`fetch\` API and \`ReadableStream\`.
- Parse the SSE chunks (separated by \`\\n\\n\`) and handle \`event: device_data\`.
- Parse the \`data: {...}\` payload. The hardware data is located in \`JSON.parse(dataStr).payload\`.
- Use a \`try/catch\` block and \`setTimeout\` to automatically reconnect if the stream disconnects.
- Create an \`async function sendCommand(propertyName, newValue)\` that sends a POST request with \`body: JSON.stringify({ type: \\\`SET_\${propertyName.toUpperCase()}\\\`, payload: { [propertyName]: newValue } })\`.
- Create an \`async function fetchHistory()\` that fetches historical time-series data using \`?limit=100\` and renders a chart using Chart.js.

Please provide a beautiful, modern UI using TailwindCSS via CDN that includes:
- A card displaying "temperature" and "humidity".
- A toggle switch for "main_light" (which triggers sendCommand).`;

    const currentAiPrompt = activeTab === 'frontend' ? frontendAiPrompt : hardwareAiPrompt;

    const ParamRow = ({ name, type, req, desc }) => (
        <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100 last:border-0 gap-2 sm:gap-4">
            <div className="w-40 shrink-0">
                <code className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">{name}</code>
            </div>
            <div className="w-24 shrink-0 flex items-center gap-1.5">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">{type}</span>
                {req && <span className="text-[10px] text-red-500 font-bold">*</span>}
            </div>
            <div className="flex-1 text-sm text-gray-600">{desc}</div>
        </div>
    );

    const MethodCard = ({ title, code, desc, children }) => (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-200">
                <h4 className="font-bold text-gray-900 text-lg mb-1">{title}</h4>
                <p className="text-sm text-gray-500">{desc}</p>
            </div>
            <div className="p-5 border-b border-gray-100">
                <code className="text-sm font-mono text-blue-700 bg-blue-50 px-3 py-2 rounded-lg block overflow-x-auto border border-blue-100">
                    {code}
                </code>
            </div>
            {children && (
                <div className="px-5 py-2 bg-white">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Parameters</div>
                    {children}
                </div>
            )}
        </div>
    );

    const CodeBlock = ({ code }) => (
        <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm shadow-inner border border-gray-800 leading-relaxed font-mono">
            {code}
        </pre>
    );

    const getDocsContent = (lang) => {
        switch (lang) {
            case 'python':
                return (
                    <div className="space-y-10 text-gray-700 animate-in fade-in duration-300">
                        {/* 1. Setup */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span> 
                                Installation & Setup
                            </h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                                <div className="bg-gray-900 text-gray-100 rounded-lg p-3 flex justify-between items-center shadow-inner">
                                    <code className="font-mono">pip install paho-mqtt</code>
                                    <button onClick={() => handleCopy("pip install paho-mqtt", "py_install")} className="text-gray-400 hover:text-white transition-colors">
                                        {copiedIndex === 'py_install' ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                                    </button>
                                </div>
                                <p className="text-sm mt-3 text-gray-600 flex items-center gap-2">
                                    <Info size={16} className="text-blue-500" />
                                    Place <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-800">mydevice.py</code> in the same directory as your Python script.
                                </p>
                            </div>
                        </section>

                        {/* 2. API Reference */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span> 
                                API Reference (Step-by-Step)
                            </h3>
                            
                            <MethodCard 
                                title="Initialize Device" 
                                desc="Connect your script to a specific device instance on the platform."
                                code='device = MyDevice("DEVICE_ID", "SECRET_KEY")'
                            >
                                <ParamRow name="device_id" type="string" req={true} desc="The unique identifier for your device from the dashboard." />
                                <ParamRow name="secret_key" type="string" req={true} desc="The authentication secret key for the device." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Reading (Read-only Sensor)" 
                                desc="Define a read-only telemetry property, like a temperature sensor or status string."
                                code='device.add_reading(name, label, data_type="number", unit="")'
                            >
                                <ParamRow name="name" type="string" req={true} desc="Unique internal ID (e.g., 'temperature'). Must be lowercase, no spaces." />
                                <ParamRow name="label" type="string" req={true} desc="Human-readable name displayed on the dashboard UI." />
                                <ParamRow name="data_type" type="string" req={false} desc="'number', 'boolean', or 'string'. Default is 'number'." />
                                <ParamRow name="unit" type="string" req={false} desc="Unit of measurement (e.g., '°C', '%')." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Switch (Controllable)" 
                                desc="Automatically generates a Toggle switch on the dashboard. Triggers a callback when pressed."
                                code='device.add_switch(name, label, on_change)'
                            >
                                <ParamRow name="name" type="string" req={true} desc="Unique internal ID." />
                                <ParamRow name="label" type="string" req={true} desc="Dashboard UI name." />
                                <ParamRow name="on_change" type="function" req={true} desc="Callback function that receives a boolean (True/False) when the switch is toggled." />
                            </MethodCard>

                            <MethodCard 
                                title="Send Data" 
                                desc="Push updated values to the cloud. Call this in your main loop."
                                code='device.send(name, value)'
                            >
                                <ParamRow name="name" type="string" req={true} desc="The property name you defined earlier." />
                                <ParamRow name="value" type="any" req={true} desc="The actual sensor reading or state value." />
                            </MethodCard>
                        </section>

                        {/* 3. Full Example */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span> 
                                Complete Implementation Example
                            </h3>
                            <p className="text-gray-600 mb-4 text-sm">
                                Putting it all together. This script initializes the device, defines its capabilities, connects to the cloud, and loops forever to send data.
                            </p>
                            <div className="relative group">
                                <CodeBlock code={`from mydevice import MyDevice
import time

# 1. Initialize
device = MyDevice("DEV-12345", "YOUR_SECRET_KEY")

# 2. Define Capabilities
device.add_reading("temperature", "Room Temp", "number", unit="°C")
device.add_reading("status_msg", "System Status", "string")

def handle_light(is_on):
    if is_on:
        print("Hardware: Turning light ON")
    else:
        print("Hardware: Turning light OFF")
        
device.add_switch("main_light", "Main Light", on_change=handle_light)

# 3. Connect to the cloud (Starts background MQTT thread)
device.connect()
print("Connected to MyDevice Platform!")

# 4. Main Loop
while True:
    # Send telemetry updates. 
    # (The SDK optimizes this and only sends if the value changed)
    device.send("temperature", 24.5)
    
    time.sleep(5)`} />
                                <button 
                                    onClick={() => handleCopy("from mydevice import MyDevice\nimport time\n\ndevice = MyDevice('DEV-12345', 'YOUR_SECRET_KEY')\n\ndevice.add_reading('temperature', 'Room Temp', 'number', unit='°C')\n\ndef handle_light(is_on):\n    print('Light', is_on)\ndevice.add_switch('main_light', 'Main Light', on_change=handle_light)\n\ndevice.connect()\n\nwhile True:\n    device.send('temperature', 24.5)\n    time.sleep(5)", "py_full")} 
                                    className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {copiedIndex === 'py_full' ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </section>
                    </div>
                );
            case 'node':
                return (
                    <div className="space-y-10 text-gray-700 animate-in fade-in duration-300">
                        {/* 1. Setup */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-green-100 text-green-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span> 
                                Installation & Setup
                            </h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                                <div className="bg-gray-900 text-gray-100 rounded-lg p-3 flex justify-between items-center shadow-inner">
                                    <code className="font-mono">npm install mqtt</code>
                                </div>
                                <p className="text-sm mt-3 text-gray-600 flex items-center gap-2">
                                    <Info size={16} className="text-blue-500" />
                                    Place <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-800">mydevice-sdk.js</code> in your project directory.
                                </p>
                            </div>
                        </section>

                        {/* 2. API Reference */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-green-100 text-green-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span> 
                                API Reference (Step-by-Step)
                            </h3>
                            
                            <MethodCard 
                                title="Initialize Device" 
                                desc="Create a new device instance."
                                code="const device = new MyDevice('DEVICE_ID', 'SECRET_KEY');"
                            >
                                <ParamRow name="deviceId" type="string" req={true} desc="Your device ID." />
                                <ParamRow name="secretKey" type="string" req={true} desc="Your secret key." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Reading" 
                                desc="Define telemetry properties."
                                code="device.addReading(name, label, type = 'number', unit = '')"
                            >
                                <ParamRow name="name" type="string" req={true} desc="Internal property ID." />
                                <ParamRow name="label" type="string" req={true} desc="Dashboard UI label." />
                                <ParamRow name="type" type="string" req={false} desc="'number', 'boolean', 'string'." />
                                <ParamRow name="unit" type="string" req={false} desc="Unit of measurement." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Slider (Controllable)" 
                                desc="Generates a slider UI for numeric control."
                                code="device.addSlider(name, label, min, max, callback, step)"
                            >
                                <ParamRow name="name" type="string" req={true} desc="Internal property ID." />
                                <ParamRow name="min/max" type="number" req={true} desc="Numeric bounds." />
                                <ParamRow name="callback" type="function" req={true} desc="Receives the new float value." />
                            </MethodCard>
                        </section>

                        {/* 3. Full Example */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-green-100 text-green-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span> 
                                Complete Implementation Example
                            </h3>
                            <CodeBlock code={`const { MyDevice } = require('./mydevice-sdk');

// 1. Initialize
const device = new MyDevice('DEV-12345', 'YOUR_SECRET_KEY');

// 2. Define Capabilities
device.addReading('temperature', 'Room Temp', 'number', '°C');

device.addSlider('fan_speed', 'Fan Speed', 0, 100, (speed) => {
    console.log(\`Hardware: Setting fan speed to \${speed}%\`);
});

// 3. Connect to cloud
device.connect();

// 4. Main Loop
setInterval(() => {
    device.send('temperature', 25.1);
}, 5000);`} />
                        </section>
                    </div>
                );
            case 'arduino':
                return (
                    <div className="space-y-10 text-gray-700 animate-in fade-in duration-300">
                        {/* 1. Setup */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-teal-100 text-teal-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span> 
                                Installation & Setup
                            </h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    Open the Arduino IDE Library Manager and install:
                                </p>
                                <ul className="list-disc list-inside text-sm text-gray-600 font-mono mb-4 bg-white p-3 rounded border">
                                    <li>PubSubClient</li>
                                    <li>ArduinoJson (v6+)</li>
                                </ul>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Info size={16} className="text-blue-500" />
                                    Place <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-800">MyDevice.h</code> in the same folder as your <code>.ino</code> sketch.
                                </p>
                            </div>
                        </section>

                        {/* 2. API Reference */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-teal-100 text-teal-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span> 
                                API Reference (Step-by-Step)
                            </h3>
                            
                            <MethodCard 
                                title="Initialize Device" 
                                desc="Construct the device object globally."
                                code='MyDevice device("DEVICE_ID", "SECRET_KEY", wifiClient);'
                            >
                                <ParamRow name="deviceId" type="string" req={true} desc="Your device ID." />
                                <ParamRow name="secretKey" type="string" req={true} desc="Your secret key." />
                                <ParamRow name="client" type="Client&" req={true} desc="Underlying network client (WiFiClient, EthernetClient)." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Reading" 
                                desc="Define telemetry properties."
                                code='device.addReading(name, label, type, unit);'
                            >
                                <ParamRow name="name" type="const char*" req={true} desc="Internal property ID." />
                                <ParamRow name="label" type="const char*" req={true} desc="Dashboard UI label." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Switch (Controllable)" 
                                desc="Generates a switch UI. Callback uses ArduinoJson JsonVariant."
                                code='device.addSwitch(name, label, [](JsonVariant val) { ... });'
                            >
                                <ParamRow name="name" type="const char*" req={true} desc="Internal property ID." />
                                <ParamRow name="callback" type="void (*)(JsonVariant)" req={true} desc="Function called when toggled. Use val.as<bool>()." />
                            </MethodCard>

                             <MethodCard 
                                title="Network Lifecycle" 
                                desc="Must be called in setup() and loop()."
                                code={'device.begin(); // in setup()\ndevice.loop();  // in loop()'}
                            />
                        </section>

                        {/* 3. Full Example */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-teal-100 text-teal-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span> 
                                Complete Implementation Example
                            </h3>
                            <CodeBlock code={`#include <WiFi.h>
#include "MyDevice.h"

// 1. Initialize Network and Device
WiFiClient wifiClient;
MyDevice device("DEV-12345", "YOUR_SECRET_KEY", wifiClient);

void setup() {
    Serial.begin(115200);
    
    // Connect to WiFi
    WiFi.begin("YOUR_SSID", "YOUR_WIFI_PASS");
    while (WiFi.status() != WL_CONNECTED) delay(500);

    // 2. Define Capabilities
    device.addReading("temperature", "Temperature", "number", "°C");
    
    // Switch callback uses ArduinoJson JsonVariant
    device.addSwitch("main_light", "Main Light", [](JsonVariant val) {
        bool isOn = val.as<bool>();
        digitalWrite(LED_BUILTIN, isOn ? HIGH : LOW);
    });

    // 3. Begin SDK
    device.begin();
}

void loop() {
    // 4. Maintain connection (handles reconnects & inbound messages)
    device.loop();
    
    // 5. Send telemetry data
    device.send("temperature", 23.5);
    
    delay(10); // Small delay to prevent tight loop blocking
}`} />
                        </section>
                    </div>
                );
            case 'frontend':
                return (
                    <div className="space-y-10 text-gray-700 animate-in fade-in duration-300">
                        {/* 1. Architecture */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span> 
                                How it Works
                            </h3>
                            <div className="bg-white border border-gray-200 p-5 rounded-xl text-sm leading-relaxed text-gray-700 shadow-sm">
                                <p className="mb-3">The MyDevice platform uses an ultra-fast real-time architecture:</p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li><strong>Hardware Device</strong> runs the SDK and sends telemetry over MQTT.</li>
                                    <li><strong>The Backend</strong> buffers the state and checks permissions.</li>
                                    <li><strong>Your HTML/JS Dashboard</strong> opens a connection via <strong>Server-Sent Events (SSE)</strong>.</li>
                                    <li>When hardware updates, the backend pushes it directly to your Javascript instantly.</li>
                                </ol>
                            </div>
                        </section>

                        {/* 2. Real-Time Data (SSE) */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span> 
                                Connect Real-Time Stream (SSE)
                            </h3>
                            <MethodCard
                                title="JavaScript connectSSE()"
                                desc="Use fetch and ReadableStream to securely stream hardware updates into your frontend."
                                code={`let appStateCache = {};\n\nasync function connectSSE(route, authToken, callback) {\n    const res = await fetch(\`http://localhost:5001\${route}\`, {\n        headers: { 'Authorization': \`Bearer \${authToken}\`, 'Accept': 'text/event-stream' }\n    });\n    \n    const reader = res.body.getReader();\n    const decoder = new TextDecoder();\n    let buffer = '';\n\n    while (true) {\n        const { value, done } = await reader.read();\n        if (done) break;\n        \n        buffer += decoder.decode(value, { stream: true });\n        const chunks = buffer.split('\\n\\n');\n        buffer = chunks.pop();\n\n        for (const chunk of chunks) {\n            let eventType = 'message', dataStr = null;\n            for (const line of chunk.split('\\n')) {\n                if (line.startsWith('event: ')) eventType = line.slice(7).trim();\n                else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();\n            }\n            \n            if (dataStr && eventType === 'device_data') {\n                const payload = JSON.parse(dataStr).payload;\n                appStateCache = { ...appStateCache, ...payload };\n                callback(payload); // Update your UI!\n            }\n        }\n    }\n}`}
                            />
                        </section>

                        {/* 3. REST APIs */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span> 
                                Fetching Historical & Current Data (REST APIs)
                            </h3>
                            
                            <MethodCard
                                title="1. Current Data (Last Known State)"
                                desc="Retrieve the most recent data payload immediately before the SSE stream connects."
                                code={`async function fetchCurrentData() {\n    const res = await fetch('http://localhost:5001/api/v1/routes/YOUR_CURRENT_DATA_ROUTE', {\n        headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n    });\n    const json = await res.json();\n    \n    // Returns: [ { device_id: "...", payload: { temp: 23 } } ]\n    if (json.success && json.data.length > 0) {\n        updateUI(json.data[0].payload);\n    }\n}`}
                            />

                            <MethodCard
                                title="2. Historical Data (Charts & Graphs)"
                                desc="Retrieve paginated time-series data for analytics."
                                code={`async function fetchHistory(deviceId, startDate, endDate) {\n    const query = new URLSearchParams({\n        device_id: deviceId,\n        start_date: startDate.toISOString(),\n        end_date: endDate.toISOString(),\n        limit: 100 // default 500, max 1000\n    });\n    \n    const res = await fetch(\`http://localhost:5001/api/v1/routes/YOUR_HISTORY_ROUTE?\${query}\`, {\n        headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n    });\n    const json = await res.json();\n    \n    if (json.success) {\n        renderChart(json.data);\n    }\n}`}
                            />

                            <MethodCard
                                title="3. Device Status"
                                desc="Retrieve the current network connectivity status of your devices."
                                code={`async function fetchDeviceStatus() {\n    const res = await fetch('http://localhost:5001/api/v1/routes/YOUR_STATUS_ROUTE', {\n        headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n    });\n    const json = await res.json();\n    \n    // Returns: [ { device_id: "...", status: "ONLINE", last_seen: "..." } ]\n}`}
                            />
                        </section>

                        {/* 4. Sending Commands */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">4</span> 
                                Sending Commands
                            </h3>
                            <MethodCard
                                title="Optimistic UI Updates"
                                desc="Standard POST request mapped to your API route. We recommend updating the UI instantly, then sending the request."
                                code={`async function sendCommand(property_name, new_value) {\n    // 1. Instantly update UI (Optimistic)\n    updateUI({ [property_name]: new_value });\n\n    // 2. Send POST request\n    try {\n        await fetch(\`http://localhost:5001/api/v1/routes/command-123\`, {\n            method: 'POST',\n            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer TOKEN\` },\n            body: JSON.stringify({ \n                type: \`SET_\${property_name.toUpperCase()}\`, \n                payload: { [property_name]: new_value }\n            })\n        });\n    } catch (err) {\n        alert("Command failed, reverting UI.");\n    }\n}`}
                            />
                        </section>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full min-h-[500px]">
            {/* Header Area */}
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">SDK Integration Guide</h1>
                <p className="text-gray-600 text-[15px] md:text-[16px] max-w-3xl leading-relaxed">
                    A comprehensive guide to integrating the MyDevice Platform into your edge hardware and software agents. 
                    The SDK uses a <strong>"Blueprint API"</strong>: you simply define your sensors and switches in the code, and 
                    the cloud platform automatically builds the dashboard UI and API routes for you.
                </p>
            </div>

            {/* AI Assistant Help Banner */}
            <div className={`mb-12 bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors duration-300 ${activeTab === 'frontend' ? 'border-orange-200' : 'border-purple-200'}`}>
                <div className={`px-6 py-4 flex items-center justify-between ${activeTab === 'frontend' ? 'bg-orange-600' : 'bg-purple-600'}`}>
                    <div className="flex items-center gap-3 text-white">
                        <Bot size={24} />
                        <h4 className="font-bold text-lg m-0">Integrating via AI? (ChatGPT / Claude)</h4>
                    </div>
                    <button 
                        onClick={() => handleCopy(currentAiPrompt, 'ai_prompt')}
                        className={`flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${activeTab === 'frontend' ? 'text-orange-700' : 'text-purple-700'}`}
                    >
                        {copiedIndex === 'ai_prompt' ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                        {copiedIndex === 'ai_prompt' ? 'Copied Prompt!' : 'Copy AI Prompt'}
                    </button>
                </div>
                <div className={`p-6 ${activeTab === 'frontend' ? 'bg-orange-50' : 'bg-purple-50'}`}>
                    <p className={`text-sm leading-relaxed max-w-4xl ${activeTab === 'frontend' ? 'text-orange-900' : 'text-purple-900'}`}>
                        {activeTab === 'frontend' 
                            ? <span>If you want to quickly build a beautiful frontend, don't write it from scratch! Click the <strong>"Copy AI Prompt"</strong> button to copy a highly detailed system instruction payload. Paste it into your favorite LLM along with your desired styling (e.g., "Make it look like a sci-fi dashboard"). The AI will generate a fully working UI that connects to our real-time streaming APIs.</span>
                            : <span>If you have existing code (like a motor controller, sensor loop, or complex logic), do not rewrite it manually. Click the <strong>"Copy AI Prompt"</strong> button to copy a highly detailed system instruction payload. Paste it into your favorite LLM along with your existing code. The AI will analyze your logic and seamlessly inject the SDK without breaking your hardware.</span>
                        }
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Platform Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50/50 p-2 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('python')}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
                            activeTab === 'python' ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <FileCode2 size={18} /> Python
                    </button>
                    <button
                        onClick={() => setActiveTab('node')}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
                            activeTab === 'node' ? 'bg-white text-green-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <Code size={18} /> Node.js
                    </button>
                    <button
                        onClick={() => setActiveTab('arduino')}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
                            activeTab === 'arduino' ? 'bg-white text-teal-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <Cpu size={18} /> Arduino C++
                    </button>
                    <button
                        onClick={() => setActiveTab('frontend')}
                        className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
                            activeTab === 'frontend' ? 'bg-white text-orange-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
                        }`}
                    >
                        <LayoutDashboard size={18} /> Frontend HTML/JS
                    </button>
                </div>

                {/* Dynamic Documentation Content */}
                <div className="p-6 md:p-10">
                    {getDocsContent(activeTab)}
                </div>
            </div>
            
            {/* Architecture Explainer */}
            <div className="mt-12 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <Settings2 className="text-blue-600" size={28} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-xl mb-3">How the Blueprint API Works</h4>
                        <p className="text-[15px] text-gray-700 leading-relaxed mb-5">
                            Unlike traditional IoT platforms where you must manually map MQTT topics and configure JSON schemas in a web portal, 
                            the MyDevice SDK uses an inverted approach. You define your capabilities directly in code.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-blue-50">
                                <div className="font-bold text-blue-900 text-sm mb-1">1. Auto Schema Generation</div>
                                <div className="text-sm text-gray-600">The SDK automatically generates a capability payload upon connection.</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-blue-50">
                                <div className="font-bold text-blue-900 text-sm mb-1">2. Instant Dashboard UI</div>
                                <div className="text-sm text-gray-600">The Cloud Dashboard reads this schema and instantly builds the correct widgets.</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-blue-50">
                                <div className="font-bold text-blue-900 text-sm mb-1">3. Automated Routing</div>
                                <div className="text-sm text-gray-600">REST endpoints (<code>POST /api/commands</code>) are mapped directly to your C++/Python callbacks.</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-blue-50">
                                <div className="font-bold text-blue-900 text-sm mb-1">4. Smart Deduplication</div>
                                <div className="text-sm text-gray-600"><code>send()</code> only triggers network traffic if the value has actually changed since the last tick.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceSdkDocs;
