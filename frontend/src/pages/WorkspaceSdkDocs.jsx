import React, { useState } from 'react';
import { Copy, CheckCircle2, Download, Terminal, Settings2, Code, Cpu, Bot, FileCode2 } from 'lucide-react';

const WorkspaceSdkDocs = () => {
    const [activeTab, setActiveTab] = useState('python');
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (code, index) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const aiPromptTemplate = `I am using the MyDevice IoT SDK to connect my hardware to a cloud dashboard. 
Please integrate this SDK into my existing code.

IMPORTANT RULES:
1. Do NOT break my existing device functionality (motor control, display logic, etc.). 
2. Only add the code needed to send telemetry data and receive commands via the SDK.
3. My Device ID is "YOUR_DEVICE_ID" and Secret Key is "YOUR_SECRET_KEY".

Here is how the SDK works (Blueprint API):
- Use \`add_reading(name, label, type, unit)\` to define read-only sensors.
- Use \`add_switch(name, label, callback)\` or \`add_slider(name, label, min, max, callback)\` to define controllable components. 
- Use \`send(name, value)\` to push data.

Please analyze my code and provide the exact snippets to add.`;

    const sdkSnippets = {
        python: {
            install: "pip install paho-mqtt",
            title: "Python SDK",
            icon: <FileCode2 size={24} className="text-blue-500" />,
            desc: "Connect Python scripts or backend servers.",
            code: `from mydevice import MyDevice
import time

# 1. Initialize Device
device = MyDevice("YOUR_DEVICE_ID", "YOUR_SECRET_KEY")

# 2. Add Read-only Telemetry
device.add_reading("temperature", "Room Temp", "number", unit="°C")
device.add_reading("humidity", "Humidity", "number", unit="%")

# 3. Add Controllable Switch
def handle_light(is_on):
    if is_on:
        print("Turning light ON")
    else:
        print("Turning light OFF")
    
device.add_switch("main_light", "Main Light", on_change=handle_light)

# 4. Connect & Loop
device.connect()
while True:
    device.send("temperature", 24.5)
    time.sleep(5)`
        },
        node: {
            install: "npm install mqtt",
            title: "Node.js SDK",
            icon: <Code size={24} className="text-green-500" />,
            desc: "Integrate Node.js edge agents.",
            code: `const { MyDevice } = require('./mydevice-sdk');

// 1. Initialize Device
const device = new MyDevice('YOUR_DEVICE_ID', 'YOUR_SECRET_KEY');

// 2. Add Read-only Telemetry
device.addReading('temperature', 'Room Temp', 'number', '°C');

// 3. Add Controllable Slider
device.addSlider('fan_speed', 'Fan Speed', 0, 100, (speed) => {
    console.log(\`Setting fan speed to \${speed}\`);
});

// 4. Connect & Loop
device.connect();
setInterval(() => {
    device.send('temperature', 25.1);
}, 5000);`
        },
        arduino: {
            install: "Install PubSubClient and ArduinoJson via Library Manager",
            title: "Arduino C++",
            icon: <Cpu size={24} className="text-teal-500" />,
            desc: "For ESP32, ESP8266, and Arduino.",
            code: `#include <WiFi.h>
#include "MyDevice.h"

WiFiClient wifiClient;
MyDevice device("YOUR_DEVICE_ID", "YOUR_SECRET_KEY", wifiClient);

void setup() {
    Serial.begin(115200);
    WiFi.begin("YOUR_SSID", "YOUR_WIFI_PASS");
    while (WiFi.status() != WL_CONNECTED) delay(500);

    // Add Telemetry & Controls
    device.addReading("temperature", "Temperature", "number", "°C");
    
    device.addSwitch("main_light", "Main Light", [](JsonVariant val) {
        digitalWrite(LED_BUILTIN, val.as<bool>() ? HIGH : LOW);
    });

    device.begin();
}

void loop() {
    device.loop();
    device.send("temperature", 23.5);
    delay(5000);
}`
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">SDK Integration</h1>
                    <p className="text-gray-500 text-sm max-w-2xl">
                        Copy these simple examples to connect your hardware to the platform. 
                        The SDK will automatically sync your sensors and dashboard controls without complex configuration.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleCopy(aiPromptTemplate, 'ai_prompt')}
                        className="flex items-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-purple-200"
                    >
                        <Bot size={16} /> 
                        {copiedIndex === 'ai_prompt' ? 'Copied Prompt!' : 'Copy Prompt for AI'}
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors">
                        <Download size={16} /> Download SDKs
                    </button>
                </div>
            </div>

            {/* AI Assistant Help Banner */}
            <div className="mb-8 p-4 bg-purple-50 rounded-xl border border-purple-100 flex gap-4">
                <Bot className="text-purple-500 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-purple-900 mb-1">Using an AI Assistant?</h4>
                    <p className="text-sm text-purple-800">
                        Click the <strong>"Copy Prompt for AI"</strong> button above. You can paste this prompt into ChatGPT, Claude, or Antigravity along with your existing device code. The AI will perfectly integrate the SDK into your code without breaking your current hardware logic!
                    </p>
                </div>
            </div>

            {/* Platform Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {Object.entries(sdkSnippets).map(([key, data]) => (
                    <div 
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            activeTab === key 
                            ? 'border-blue-500 bg-blue-50 shadow-md transform -translate-y-1' 
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            {data.icon}
                            <h3 className={`font-bold ${activeTab === key ? 'text-blue-900' : 'text-gray-800'}`}>
                                {data.title}
                            </h3>
                        </div>
                        <p className={`text-sm ${activeTab === key ? 'text-blue-700' : 'text-gray-500'}`}>
                            {data.desc}
                        </p>
                    </div>
                ))}
            </div>

            {/* Code Section */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="ml-2 text-xs font-medium text-gray-400 font-mono tracking-wider uppercase">
                            {activeTab} implementation
                        </span>
                    </div>
                    <button 
                        onClick={() => handleCopy(sdkSnippets[activeTab].code, 'code')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        {copiedIndex === 'code' ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>

                {/* Installation Tip */}
                <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center gap-3">
                    <Terminal size={16} className="text-blue-400" />
                    <code className="text-sm font-mono text-gray-200">
                        {sdkSnippets[activeTab].install}
                    </code>
                </div>

                {/* Code Block */}
                <div className="p-6 overflow-x-auto">
                    <pre className="text-sm font-mono leading-relaxed text-blue-100">
                        <code>{sdkSnippets[activeTab].code}</code>
                    </pre>
                </div>
            </div>
            
            <div className="mt-8 p-5 bg-blue-50 rounded-xl border border-blue-100 flex gap-4">
                <Settings2 className="text-blue-500 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-900 mb-1">How it works</h4>
                    <p className="text-sm text-blue-800">
                        By defining properties like <code>add_reading</code> or <code>add_switch</code>, 
                        the SDK handles all the complex MQTT connection details automatically. It syncs your dashboard UI elements 
                        and command routes immediately without any manual setup.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceSdkDocs;
