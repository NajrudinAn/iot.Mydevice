import React, { useState } from 'react';
import { BookOpen, Copy, CheckCircle2, Download, Terminal, Settings2 } from 'lucide-react';

const WorkspaceSdkDocs = () => {
    const [activeTab, setActiveTab] = useState('python');
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (code, index) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const sdkSnippets = {
        python: {
            install: "pip install paho-mqtt",
            title: "Python SDK (v2.0)",
            icon: "🐍",
            desc: "Connect Python scripts, Raspberry Pi, or backend servers using the Blueprint API.",
            code: `from mydevice import MyDevice
import time

# 1. Initialize Device
device = MyDevice("YOUR_DEVICE_ID", "YOUR_SECRET_KEY")

# 2. Add Read-only Telemetry
device.add_reading("temperature", "Room Temp", "number", unit="°C")
device.add_reading("humidity", "Humidity", "number", unit="%")

# 3. Add Controllable Switch
def handle_light(is_on):
    print("Turning light ON" if is_on else "Turning light OFF")
    
device.add_switch("main_light", "Main Light", on_change=handle_light)

# 4. Connect & Loop
device.connect()
while True:
    device.send("temperature", 24.5)
    time.sleep(5)`
        },
        node: {
            install: "npm install mqtt",
            title: "Node.js SDK (v2.0)",
            icon: "🟢",
            desc: "Integrate headless Node.js edge agents and gateways.",
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
            title: "Arduino C++ SDK (v2.0)",
            icon: "⚡",
            desc: "For ESP32, ESP8266, and Arduino connected hardware.",
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
                        Download the official MyDevice SDKs to connect your hardware. The Blueprint API automatically 
                        syncs your telemetry, states, and capabilities to the dashboard.
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors">
                    <Download size={16} /> Download SDKs
                </button>
            </div>

            {/* Platform Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {Object.entries(sdkSnippets).map(([key, data]) => (
                    <div 
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={\`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 \${
                            activeTab === key 
                            ? 'border-blue-500 bg-blue-50 shadow-md transform -translate-y-1' 
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                        }\`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{data.icon}</span>
                            <h3 className={\`font-bold \${activeTab === key ? 'text-blue-900' : 'text-gray-800'}\`}>
                                {data.title}
                            </h3>
                        </div>
                        <p className={\`text-sm \${activeTab === key ? 'text-blue-700' : 'text-gray-500'}\`}>
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
                    <h4 className="font-bold text-blue-900 mb-1">Blueprint API Architecture</h4>
                    <p className="text-sm text-blue-800">
                        The SDK uses a declarative blueprint schema. By simply defining properties (like <code>add_reading</code> or <code>add_switch</code>), 
                        the SDK automatically negotiates the schema with the cloud. The platform then generates the necessary dashboard UI elements 
                        and command routes immediately without any manual configuration.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceSdkDocs;
