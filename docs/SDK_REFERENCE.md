# MyDevice SDK Reference

The MyDevice SDK connects your hardware to the MyDevice IoT platform. The SDK uses a **Blueprint API**, meaning you simply declare what your device *has* (Properties) and what it *can do* (Actions). The SDK automatically manages the MQTT connection, auto-reconnection, telemetry syncing, and command routing.

The SDK is available for **Python**, **Node.js**, and **Arduino (C++)**.

---

## 1. Installation

### Python
```bash
pip install paho-mqtt
```
Place `mydevice.py` in your project folder.

### Node.js
```bash
npm install mqtt
```
Place `mydevice-sdk.js` in your project folder.

### Arduino
Requires `PubSubClient` and `ArduinoJson` libraries.
Place `MyDevice.h` in your sketch folder and `#include "MyDevice.h"`.

---

## 2. Properties (State & Telemetry)

Properties represent the state of your device. We provide ultra-simple **Semantic Helpers** so you can easily define the exact type of property without complex configurations.

### Read-Only Data (Telemetry, Status, etc.)
Read-only properties continuously stream data to the platform but cannot be controlled from the UI. You can send numbers (like sensors) or strings (like status messages).

**Python:**
```python
device.add_reading("temperature", "Temperature", data_type="number", unit="°C")
device.add_reading("status_msg", "System Status", data_type="string")
```

**Node.js:**
```javascript
device.addReading('temperature', 'Temperature', 'number', '°C');
device.addReading('status_msg', 'System Status', 'string');
```

**Arduino:**
```cpp
device.addReading("temperature", "Temperature", "number", "°C");
device.addReading("status_msg", "System Status", "string");
```

### Controllable Switches (Booleans)
Switches automatically generate "SET" commands from the platform. The SDK handles the MQTT command and automatically updates the local cache, but you provide an `on_change` callback to actually trigger your hardware (like flipping a relay).

**Python:**
```python
def handle_light(is_on):
    if is_on:
        print("Turning light ON")
    else:
        print("Turning light OFF")

device.add_switch("main_light", "Main Light", on_change=handle_light)
```

**Node.js:**
```javascript
device.addSwitch('main_light', 'Main Light', (isOn) => {
    if (isOn) {
        console.log('Turning light ON');
    } else {
        console.log('Turning light OFF');
    }
});
```

**Arduino:**
```cpp
device.addSwitch("main_light", "Main Light", [](bool isOn) {
    if (isOn) {
        digitalWrite(LED_BUILTIN, HIGH);
        Serial.println("Light turned ON");
    } else {
        digitalWrite(LED_BUILTIN, LOW);
        Serial.println("Light turned OFF");
    }
});
```

### Controllable Sliders (Numbers)
Sliders let you set numeric values with specific bounds.

**Python:**
```python
def handle_fan(speed):
    print(f"Setting fan speed to {speed}")

device.add_slider("fan_speed", "Fan Speed", min_val=0, max_val=100, step=1, on_change=handle_fan)
```

**Node.js:**
```javascript
device.addSlider('fan_speed', 'Fan Speed', 0, 100, (speed) => {
    console.log(`Setting fan speed to ${speed}`);
});
```

**Arduino:**
```cpp
device.addSlider("fan_speed", "Fan Speed", 0, 100, [](float speed) {
    analogWrite(FAN_PIN, speed);
    Serial.println("Fan speed updated");
});
```

*(Note: Advanced custom properties can still be created using the base `add_property` / `addProperty` functions if you need custom dropdowns or string modes).*

---

## 3. Stateless Actions

Actions are commands that do not represent continuous state (e.g., Reboot, Calibrate, Open Door).

**Python:**
```python
def handle_reboot(params):
    print("Rebooting hardware...")

device.add_action("reboot", "Reboot Device", "Restarts hardware", on_execute=handle_reboot)
```

**Node.js:**
```javascript
device.addAction('reboot', 'Reboot Device', 'Restarts hardware', {}, (params) => {
    console.log('Rebooting hardware...');
});
```

**Arduino:**
```cpp
device.addAction("reboot", "Reboot Device", "Restarts hardware", [](JsonObject params) {
    Serial.println("Rebooting hardware...");
    ESP.restart();
});
```

---

## 4. Execution & Sending Data

Once your blueprint is defined, connect to the platform. To send telemetry, just call `send()`—the SDK automatically batches and publishes the data if it has changed since the last send.

### Python Example
```python
device.connect() # Non-blocking background thread by default

while True:
    device.send("temperature", read_sensor())
    device.send("status_msg", "System OK")
    time.sleep(5)
```

### Node.js Example
```javascript
device.connect();

setInterval(() => {
    device.send('temperature', readSensor());
    device.send('status_msg', 'System OK');
}, 5000);
```

### Arduino Example
```cpp
void setup() {
    device.begin();
}

void loop() {
    device.loop(); // Must be called continuously
    
    device.send("temperature", readSensor());
    device.send("status_msg", "System OK");
}
```

---

## 5. Under the Hood
1. **Non-Blocking Auto-Reconnect:** If the Wi-Fi or MQTT connection drops, the SDK will automatically attempt to reconnect. For Arduino, this uses a non-blocking `millis()` timer so your main loop will never freeze!
2. **Capability Sync:** Upon connection, the SDK automatically translates your blueprint into a JSON schema and publishes it to `devices/{id}/capabilities`, allowing the web dashboard to instantly render the correct UI elements.
3. **State Sync:** The SDK maintains a local cache. It only publishes telemetry when a property's value *actually changes*.
