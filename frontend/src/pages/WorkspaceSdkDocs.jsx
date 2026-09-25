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

    const pythonAiPrompt = `SYSTEM INSTRUCTION: You are an expert Python IoT developer. Your task is to integrate the MyDevice IoT Platform SDK into the user's provided Python code.

RULES:
1. Do NOT break the user's existing device functionality. 
2. Only inject the necessary SDK initialization, Blueprint declarations, and data-sending logic.

SDK ARCHITECTURE & BLUEPRINT API:
The SDK uses a "Blueprint API". You define properties and actions in the code, and the cloud auto-generates the UI dashboard.

1. INITIALIZATION:
   - Requires \`paho-mqtt\` package.
   - \`device = MyDevice(DEVICE_ID, SECRET_KEY)\`
     * DEVICE_ID: The unique string identifier for the device.
     * SECRET_KEY: The authentication string for the device.

2. READ-ONLY TELEMETRY (Sensors, Metrics):
   - \`device.add_reading(name, label, data_type="number", unit="")\`
     * name (str): Unique internal ID (e.g., 'temp'). Must be lowercase, no spaces.
     * label (str): Human-readable UI name (e.g., 'Temperature').
     * data_type (str): 'number', 'boolean', or 'string'.
     * unit (str): Unit of measurement (e.g., '°C').

3. CONTROLLABLE COMPONENTS (Actuators, Settings):
   - \`device.add_switch(name, label, on_change_callback)\`
     * name (str): Internal ID.
     * label (str): UI Name.
     * on_change_callback (function): Called when toggled. Receives a single boolean argument (True/False).
   - \`device.add_slider(name, label, min_val, max_val, on_change_callback)\`
     * name, label: Same as above.
     * min_val (float): Minimum slider value.
     * max_val (float): Maximum slider value.
     * on_change_callback (function): Called on change. Receives a single float argument.
   - \`device.add_property(name, label, property_type, unit, min_val, max_val, options, writable, on_change_callback)\`
     * Advanced control. e.g., Dropdowns if \`options=["A", "B"]\` and \`property_type="string"\`.

4. STATELESS ACTIONS (Buttons/Commands):
   - \`device.add_action(name, label, description, parameters_dict, on_execute_callback)\`
     * name (str): Internal ID.
     * label (str): Button text.
     * description (str): Subtitle.
     * parameters_dict (dict): Dictionary of inputs to ask the user for before executing. Pass {} if none.
     * on_execute_callback (function): Fired on click.

5. THREADING & CONNECTION (CRITICAL):
   - \`device.connect()\` spawns a background thread. DO NOT put inside a \`while True\` loop. Call ONCE before the loop.

6. SENDING TELEMETRY DATA:
   - \`device.send(name, value)\`
     * name (str): Property name defined earlier.
     * value (any): Sensor reading.
     Push data in the main loop. The SDK auto-deduplicates traffic.

YOUR BEHAVIOR: Wait for the user to provide their Python code and explain their goals. Inject the SDK cleanly.`;

    const arduinoAiPrompt = `SYSTEM INSTRUCTION: You are an expert C++/Arduino IoT developer. Your task is to integrate the MyDevice IoT Platform SDK into the user's Arduino code.

RULES:
1. Do NOT break the user's existing device functionality. 
2. Use standard C++ best practices (no memory leaks).

SDK ARCHITECTURE & BLUEPRINT API:
The SDK uses a "Blueprint API". You define properties and actions in the code, and the cloud auto-generates the UI dashboard.

1. INITIALIZATION:
   - Requires \`PubSubClient\` and \`ArduinoJson\`.
   - \`MyDevice device(DEVICE_ID, SECRET_KEY, wifiClient);\`
     * DEVICE_ID (const char*): Unique string ID.
     * SECRET_KEY (const char*): Auth string.
     * wifiClient (Client&): A valid network client (e.g., WiFiClient).

2. READ-ONLY TELEMETRY:
   - \`device.addReading(name, label, data_type, unit);\`
     * name (const char*): Unique internal ID (lowercase, no spaces).
     * label (const char*): Human-readable UI name.
     * data_type (const char*): "number", "boolean", or "string".
     * unit (const char*): Unit (e.g., "°C").

3. CONTROLLABLE COMPONENTS:
   - \`device.addSwitch(name, label, callback);\`
     * callback (void (*)(JsonVariant)): Receives ArduinoJson JsonVariant. Cast with \`val.as<bool>()\`.
   - \`device.addSlider(name, label, min_val, max_val, callback);\`
     * callback (void (*)(JsonVariant)): Cast with \`val.as<float>()\`.

4. STATELESS ACTIONS:
   - \`device.addAction(name, label, description, params, callback);\`
     * params (const char*): JSON string of parameters (pass "" if none).
     * callback (void (*)(JsonVariant)): Fired on click.

5. CONNECTION & LOOPING (CRITICAL):
   - C++ does NOT spawn a thread.
   - \`device.begin();\` MUST be in \`setup()\`.
   - \`device.loop();\` MUST be in \`loop()\`.
   - Do NOT use blocking \`delay()\`. Use non-blocking \`millis()\` timers.

6. SENDING TELEMETRY DATA:
   - \`device.send(name, value);\`
     * Push sensor data using non-blocking timers.

YOUR BEHAVIOR: Wait for the user to provide their Arduino code. Inject the SDK cleanly using \`millis()\` timers.`;

    const nodeAiPrompt = pythonAiPrompt.replace('Python', 'Node.js').replace('device = MyDevice', 'const device = new MyDevice').replace('paho-mqtt', 'mqtt').replace('True/False', 'true/false');

    const frontendAiPrompt = `SYSTEM INSTRUCTION: You are an expert frontend developer. Your task is to build a custom HTML/JS frontend dashboard for the user's IoT project.

IMPORTANT PLATFORM RULES:
1. Real-time data streams via Server-Sent Events (SSE) using the MyDeviceFrontend SDK.
2. The UI must be fully reactive and dynamically update when data arrives.

JAVASCRIPT SDK FULL API REFERENCE:
1. IMPORT THE SDK:
   \`<script src="https://mydevice.in/sdk/mydevice-frontend.js"></script>\`

2. INITIALIZATION:
   \`\`\`javascript
   const client = new MyDeviceFrontend({
       token: 'Bearer YOUR_TOKEN',               // The auth token.
       telemetryRoute: 'YOUR_TELEMETRY_ROUTE',  // Endpoint for SSE stream.
       commandRoute: 'YOUR_COMMAND_ROUTE',      // Endpoint for POST commands.
   });
   \`\`\`

3. CONNECTION STATUS & LIFECYCLE:
   \`\`\`javascript
   client.onStatus((state) => {
       // state.status: 'CONNECTED', 'RECONNECTING', or 'PAUSED_HIDDEN'
   });
   \`\`\`

4. LISTENING FOR REAL-TIME DATA:
   \`\`\`javascript
   client.onData((data, deviceId) => {
       // data (object): Key-value pairs of updated properties (e.g., { temperature: 24.5 })
       // deviceId (string): The ID of the hardware that sent the data.
   });
   \`\`\`

5. STARTING THE STREAM:
   \`client.connectRealtime();\` (Must be called to open SSE connection).

6. SENDING COMMANDS (Optimistic UI):
   \`await client.sendCommand(property_name, value)\`
   * property_name (string): The internal ID of the property to change.
   * value (any): The new value.
   * The SDK automatically fires \`onData\` with the new value instantly, sends the API request, and auto-reverts if it fails.

YOUR BEHAVIOR: Wait for the user to describe their UI requirements and provide their API routes/tokens. Generate a single-file HTML dashboard using this SDK.`;

    const currentAiPrompt = activeTab === 'frontend' ? frontendAiPrompt : activeTab === 'arduino' ? arduinoAiPrompt : activeTab === 'node' ? nodeAiPrompt : pythonAiPrompt;

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
            <div className="p-5 border-b border-gray-100 bg-gray-900">
                <code className="text-sm font-mono text-gray-100 bg-gray-900 rounded-lg block overflow-x-auto whitespace-pre-wrap leading-relaxed">
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
                                title="Add Slider (Controllable)" 
                                desc="Generates a Slider UI on the dashboard. Ideal for PWM or percentage values."
                                code='device.add_slider(name, label, min_val, max_val, on_change)'
                            >
                                <ParamRow name="name" type="string" req={true} desc="Unique internal ID." />
                                <ParamRow name="label" type="string" req={true} desc="Dashboard UI name." />
                                <ParamRow name="min_val" type="number" req={true} desc="Minimum slider value." />
                                <ParamRow name="max_val" type="number" req={true} desc="Maximum slider value." />
                                <ParamRow name="on_change" type="function" req={true} desc="Callback function that receives the new float value." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Action (Stateless Button)" 
                                desc="Generates a clickable button to trigger a one-off action (e.g., Reboot, Calibrate)."
                                code='device.add_action(name, label, description, params_dict, on_execute)'
                            >
                                <ParamRow name="name" type="string" req={true} desc="Unique internal ID." />
                                <ParamRow name="label" type="string" req={true} desc="Button text." />
                                <ParamRow name="description" type="string" req={false} desc="Subtitle explaining the action." />
                                <ParamRow name="params_dict" type="dict" req={true} desc="Dictionary of parameters to ask the user before executing (empty {} for none)." />
                                <ParamRow name="on_execute" type="function" req={true} desc="Callback fired when button is pressed." />
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
                                title="Add Switch (Controllable)" 
                                desc="Generates a switch UI."
                                code="device.addSwitch(name, label, callback)"
                            >
                                <ParamRow name="name" type="string" req={true} desc="Internal property ID." />
                                <ParamRow name="callback" type="function" req={true} desc="Receives boolean." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Slider (Controllable)" 
                                desc="Generates a slider UI for numeric control."
                                code="device.addSlider(name, label, min, max, callback)"
                            >
                                <ParamRow name="name" type="string" req={true} desc="Internal property ID." />
                                <ParamRow name="min/max" type="number" req={true} desc="Numeric bounds." />
                                <ParamRow name="callback" type="function" req={true} desc="Receives the new float value." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Action (Stateless Button)" 
                                desc="Generates a clickable button."
                                code="device.addAction(name, label, description, paramsDict, callback)"
                            >
                                <ParamRow name="name" type="string" req={true} desc="Internal ID." />
                                <ParamRow name="callback" type="function" req={true} desc="Fired on click." />
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
                                    Download <a href="/sdk/MyDevice.zip" download className="text-blue-600 hover:underline">MyDevice.zip</a> and add via <strong>Sketch -{'>'} Include Library -{'>'} Add .ZIP Library</strong> in your Arduino IDE.
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
                                title="Add Slider (Controllable)" 
                                desc="Generates a slider UI."
                                code='device.addSlider(name, label, min, max, [](JsonVariant val) { ... });'
                            >
                                <ParamRow name="name" type="const char*" req={true} desc="Internal property ID." />
                                <ParamRow name="callback" type="void (*)(JsonVariant)" req={true} desc="Function called on change. Use val.as<float>()." />
                            </MethodCard>

                            <MethodCard 
                                title="Add Action (Stateless Button)" 
                                desc="Generates a clickable button."
                                code='device.addAction(name, label, description, params, [](JsonVariant val) { ... });'
                            >
                                <ParamRow name="name" type="const char*" req={true} desc="Internal ID." />
                                <ParamRow name="callback" type="void (*)(JsonVariant)" req={true} desc="Fired on click." />
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

                        {/* 2. Real-Time Data (SSE) & Commands */}
                        <section>
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span> 
                                Using the Frontend JavaScript SDK
                            </h3>
                            <MethodCard
                                title="Import and Initialize"
                                desc="Include the SDK script and connect to your streams with just a few lines of code. It automatically handles SSE parsing, reconnects, and visibility disconnects."
                                code={`<!-- 1. Include the SDK -->\n<script src="https://mydevice.in/sdk/mydevice-frontend.js"></script>\n\n<script>\n    // 2. Initialize the Device Client\n    const client = new MyDeviceFrontend({\n        token: 'YOUR_AUTH_TOKEN',\n        telemetryRoute: '/api/v1/routes/YOUR_TELEMETRY_ROUTE',\n        commandRoute: '/api/v1/routes/YOUR_COMMAND_ROUTE'\n    });\n\n    // 3. Listen for Real-Time Updates\n    client.onData((data, deviceId) => {\n        if (data.temperature !== undefined) {\n            document.getElementById('temp').innerText = data.temperature;\n        }\n    });\n\n    // 4. Start the Stream\n    client.connectRealtime();\n\n    // 5. Send Commands Easily\n    async function turnOnFan() {\n        await client.sendCommand('cooling_fan', true);\n    }\n</script>`}
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
                <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight mb-4">
                    SDK Integration Guide
                </h1>
                <p className="text-gray-500 text-[15px] md:text-lg max-w-3xl leading-relaxed font-medium">
                    A comprehensive guide to integrating the MyDevice Platform into your edge hardware and software agents. 
                    The SDK uses a <strong>"Blueprint API"</strong>: you simply define your sensors and switches in the code, and 
                    the cloud platform automatically builds the dashboard UI and API routes for you.
                </p>
            </div>

            {/* AI Assistant Help Banner */}
            <div className="mb-12 relative group rounded-[2rem] overflow-hidden p-[2px] shadow-xl shadow-indigo-500/10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]"></div>
                <div className="relative bg-white/90 backdrop-blur-xl rounded-[calc(2rem-2px)] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                            <Bot size={24} className="text-white" />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-xl text-gray-900 mb-1">Integrating via AI? (ChatGPT / Claude)</h4>
                            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl font-medium">
                                {activeTab === 'frontend' 
                                    ? <span>If you want to quickly build a beautiful frontend, don't write it from scratch! Click <strong>"Copy AI Prompt"</strong> to copy a highly detailed system instruction payload. Paste it into your LLM along with your desired styling.</span>
                                    : <span>If you have existing code, do not rewrite it manually. Click <strong>"Copy AI Prompt"</strong> to copy a highly detailed system instruction payload. Paste it into your LLM along with your existing code to seamlessly inject the SDK.</span>
                                }
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleCopy(currentAiPrompt, 'ai_prompt')}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                    >
                        {copiedIndex === 'ai_prompt' ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                        {copiedIndex === 'ai_prompt' ? 'Copied Prompt!' : 'Copy AI Prompt'}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Platform Tabs */}
                <div className="flex bg-gray-50/80 p-2 border-b border-gray-100 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('python')}
                        className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${
                            activeTab === 'python' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                        }`}
                    >
                        <FileCode2 size={18} className={activeTab === 'python' ? 'text-blue-600' : ''} /> Python
                    </button>
                    <button
                        onClick={() => setActiveTab('node')}
                        className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${
                            activeTab === 'node' ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                        }`}
                    >
                        <Code size={18} className={activeTab === 'node' ? 'text-green-600' : ''} /> Node.js
                    </button>
                    <button
                        onClick={() => setActiveTab('arduino')}
                        className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${
                            activeTab === 'arduino' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                        }`}
                    >
                        <Cpu size={18} className={activeTab === 'arduino' ? 'text-teal-600' : ''} /> Arduino C++
                    </button>
                    <button
                        onClick={() => setActiveTab('frontend')}
                        className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${
                            activeTab === 'frontend' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                        }`}
                    >
                        <LayoutDashboard size={18} className={activeTab === 'frontend' ? 'text-orange-500' : ''} /> Frontend HTML/JS
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
