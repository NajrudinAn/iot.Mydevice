import React, { useState } from 'react';
import { Copy, CheckCircle2, Download, Terminal, Settings2, Code, Cpu, Bot, FileCode2, BookOpen, Key, Wifi, Activity, TerminalSquare } from 'lucide-react';

const WorkspaceSdkDocs = () => {
    const [activeTab, setActiveTab] = useState('python');
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const aiPromptTemplate = `I am using the MyDevice IoT Platform SDK to connect my hardware to a cloud dashboard. 
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

    const getDocsContent = (lang) => {
        switch (lang) {
            case 'python':
                return (
                    <div className="space-y-6 text-gray-700">
                        <div className="prose max-w-none">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <FileCode2 className="text-blue-500" /> Python (v2.0)
                            </h3>
                            <p>
                                The Python SDK is perfect for Raspberry Pi, desktop simulators, and backend server agents. 
                                It requires Python 3.7+ and the <code>paho-mqtt</code> library.
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Terminal size={18} className="text-gray-500" /> 1. Installation
                            </h4>
                            <div className="bg-gray-900 text-gray-100 rounded-lg p-3 flex justify-between items-center">
                                <code>pip install paho-mqtt</code>
                                <button onClick={() => handleCopy("pip install paho-mqtt", "py_install")} className="text-gray-400 hover:text-white">
                                    {copiedIndex === 'py_install' ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            </div>
                            <p className="text-sm mt-2 text-gray-600">Also, place <code>mydevice.py</code> in the same folder as your script.</p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Key size={18} className="text-gray-500" /> 2. Connection & Setup
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">Import the library and create a device instance using your Device ID and Secret Key.</p>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`from mydevice import MyDevice
import time

# Create device instance
device = MyDevice("YOUR_DEVICE_ID", "YOUR_SECRET_KEY")`}
                            </pre>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Activity size={18} className="text-gray-500" /> 3. Defining Capabilities (Blueprint API)
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Define what your device can measure and what it can control. The platform will automatically build the dashboard UI based on this.
                            </p>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`# Read-only Telemetry (e.g. Sensors)
device.add_reading("temperature", "Room Temp", "number", unit="°C")
device.add_reading("status_msg", "System Status", "string")

# Controllable Switch (Generates a UI Toggle)
def handle_light(is_on):
    if is_on:
        print("Light turned ON")
    else:
        print("Light turned OFF")
        
device.add_switch("main_light", "Main Light", on_change=handle_light)

# Stateless Action (Generates a UI Button)
def handle_reboot(params):
    print("Rebooting device...")
    
device.add_action("reboot", "Reboot Device", on_execute=handle_reboot)`}
                            </pre>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Wifi size={18} className="text-gray-500" /> 4. Connect and Send Data
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Finally, call <code>connect()</code> to negotiate the schema, and use <code>send()</code> inside your main loop to publish telemetry updates.
                            </p>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`# Connect to the cloud (starts background MQTT thread)
device.connect()

# Main Loop
while True:
    # Send telemetry updates
    # The SDK optimizes this and only sends if the value actually changed
    device.send("temperature", 24.5)
    
    time.sleep(5)`}
                            </pre>
                        </div>
                    </div>
                );
            case 'node':
                return (
                    <div className="space-y-6 text-gray-700">
                        <div className="prose max-w-none">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Code className="text-green-500" /> Node.js (v2.0)
                            </h3>
                            <p>
                                The Node.js SDK is ideal for edge gateways, headless devices, and javascript automation environments. 
                                It requires the standard <code>mqtt</code> NPM package.
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Terminal size={18} className="text-gray-500" /> 1. Installation
                            </h4>
                            <div className="bg-gray-900 text-gray-100 rounded-lg p-3 flex justify-between items-center">
                                <code>npm install mqtt</code>
                                <button onClick={() => handleCopy("npm install mqtt", "js_install")} className="text-gray-400 hover:text-white">
                                    {copiedIndex === 'js_install' ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            </div>
                            <p className="text-sm mt-2 text-gray-600">Also, place <code>mydevice-sdk.js</code> in your project folder.</p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Key size={18} className="text-gray-500" /> 2. Connection & Setup
                            </h4>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`const { MyDevice } = require('./mydevice-sdk');

// Create device instance
const device = new MyDevice('YOUR_DEVICE_ID', 'YOUR_SECRET_KEY');`}
                            </pre>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Activity size={18} className="text-gray-500" /> 3. Defining Capabilities (Blueprint API)
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                You can add readings, switches, sliders, and actions.
                            </p>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`// Read-only Telemetry
device.addReading('temperature', 'Room Temp', 'number', '°C');

// Controllable Switch
device.addSwitch('main_light', 'Main Light', (val) => {
    console.log(val ? 'Light ON' : 'Light OFF');
});

// Controllable Slider
device.addSlider('fan_speed', 'Fan Speed', 0, 100, (speed) => {
    console.log(\`Fan speed set to \${speed}%\`);
});`}
                            </pre>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Wifi size={18} className="text-gray-500" /> 4. Connect and Send Data
                            </h4>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`// Connect to cloud
device.connect();

// Send telemetry every 5 seconds
setInterval(() => {
    device.send('temperature', 25.1);
}, 5000);`}
                            </pre>
                        </div>
                    </div>
                );
            case 'arduino':
                return (
                    <div className="space-y-6 text-gray-700">
                        <div className="prose max-w-none">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Cpu className="text-teal-500" /> Arduino C++ (v2.0)
                            </h3>
                            <p>
                                The C++ SDK is highly optimized for microcontrollers like the ESP32 and ESP8266. 
                                It uses minimal memory and handles network disconnections smoothly.
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Terminal size={18} className="text-gray-500" /> 1. Installation
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                In the Arduino IDE Library Manager, install <strong>PubSubClient</strong> and <strong>ArduinoJson</strong>. 
                                Then place <code>MyDevice.h</code> in the same folder as your <code>.ino</code> sketch.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <TerminalSquare size={18} className="text-gray-500" /> 2. Complete Example Sketch
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                The Arduino implementation requires you to manage the network connection, but the SDK handles all the MQTT and JSON logic.
                            </p>
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`#include <WiFi.h>
#include "MyDevice.h"

// 1. Initialize Network and Device
WiFiClient wifiClient;
MyDevice device("YOUR_DEVICE_ID", "YOUR_SECRET_KEY", wifiClient);

void setup() {
    Serial.begin(115200);
    
    // Connect to WiFi
    WiFi.begin("YOUR_SSID", "YOUR_WIFI_PASS");
    while (WiFi.status() != WL_CONNECTED) delay(500);

    // 2. Define Capabilities (Blueprint API)
    device.addReading("temperature", "Temperature", "number", "°C");
    
    // Switch callback uses ArduinoJson JsonVariant
    device.addSwitch("main_light", "Main Light", [](JsonVariant val) {
        digitalWrite(LED_BUILTIN, val.as<bool>() ? HIGH : LOW);
    });

    // 3. Begin SDK
    device.begin();
}

void loop() {
    // 4. Maintain connection and process commands
    device.loop();
    
    // 5. Send telemetry data
    device.send("temperature", 23.5);
    
    delay(10); // Small delay to prevent tight loop blocking
}`}
                            </pre>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">SDK Documentation</h1>
                    <p className="text-gray-500 text-[15px] max-w-3xl leading-relaxed">
                        A complete guide to integrating the MyDevice Platform into your edge hardware and software agents. 
                        The SDK uses a "Blueprint API", meaning you just define your sensors and switches in the code, and 
                        the cloud platform automatically builds the dashboard and API routes for you.
                    </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                    <button 
                        onClick={() => handleCopy(aiPromptTemplate, 'ai_prompt')}
                        className="flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors border border-purple-200"
                    >
                        <Bot size={18} /> 
                        {copiedIndex === 'ai_prompt' ? 'Copied Prompt!' : 'Copy AI Prompt'}
                    </button>
                </div>
            </div>

            {/* AI Assistant Help Banner */}
            <div className="mb-10 p-5 bg-purple-50 rounded-xl border border-purple-100 flex gap-4">
                <Bot className="text-purple-600 shrink-0 mt-1" size={24} />
                <div>
                    <h4 className="font-bold text-purple-900 mb-2">Integrating via ChatGPT or Claude?</h4>
                    <p className="text-sm text-purple-800 leading-relaxed">
                        If you have existing code (like a motor controller or complex sensor array), do not rewrite it manually. 
                        Click the <strong>"Copy AI Prompt"</strong> button above and paste it into your favorite LLM along with your existing code. 
                        The AI will analyze your logic and seamlessly inject the SDK connection functions without breaking your hardware.
                    </p>
                </div>
            </div>

            {/* Platform Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8">
                <button
                    onClick={() => setActiveTab('python')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'python' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <FileCode2 size={18} /> Python
                </button>
                <button
                    onClick={() => setActiveTab('node')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'node' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <Code size={18} /> Node.js
                </button>
                <button
                    onClick={() => setActiveTab('arduino')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'arduino' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <Cpu size={18} /> Arduino C++
                </button>
            </div>

            {/* Dynamic Documentation Content */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                {getDocsContent(activeTab)}
            </div>
            
            <div className="mt-10 p-6 bg-blue-50 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-5 items-start">
                <Settings2 className="text-blue-500 shrink-0 md:mt-1" size={28} />
                <div>
                    <h4 className="font-bold text-blue-900 text-lg mb-2">How the Blueprint API Works</h4>
                    <p className="text-sm text-blue-800 leading-relaxed mb-4">
                        Unlike traditional IoT platforms where you must manually map MQTT topics and configure JSON schemas in a web portal, 
                        the MyDevice SDK uses an inverted approach. You define your capabilities directly in code using <code>add_reading</code>, <code>add_switch</code>, etc. 
                    </p>
                    <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                        <li>The SDK automatically generates a schema capability payload upon connection.</li>
                        <li>The Cloud Dashboard reads this schema and instantly generates the correct UI widgets.</li>
                        <li>The Cloud API router automatically maps standard REST endpoints (<code>POST /api/commands</code>) to your device's specific callbacks.</li>
                        <li>Data payloads are deduplicated; <code>send()</code> only triggers network traffic if the value has actually changed since the last tick.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceSdkDocs;
