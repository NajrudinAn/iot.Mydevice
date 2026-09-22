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

Properties represent the state of your device. They can be **read-only** (like a temperature sensor) or **writable** (like a light switch).

### Read-Only Sensors
Read-only properties continuously stream data to the platform but cannot be controlled from the UI.

**Python:**
```python
device.add_property(name="temperature", label="Temperature", data_type="number", unit="°C")
```

**Node.js:**
```javascript
device.addProperty('temperature', 'Temperature', 'number', { unit: '°C' });
```

**Arduino:**
```cpp
device.addProperty("temperature", "Temperature", "number", false, nullptr, "°C");
```

### Controllable Switches (Booleans)
Writable properties automatically generate "SET" commands from the platform. The SDK will automatically update its internal state when a command is received, but you must provide an `on_change` callback to actually trigger the hardware change.

**Python:**
```python
device.add_property("main_light", "Main Light", "boolean", writable=True, 
                    on_change=lambda val: set_light(val))
```

**Node.js:**
```javascript
device.addProperty('main_light', 'Main Light', 'boolean', {
    writable: true, 
    onChange: (val) => setLight(val)
});
```

**Arduino:**
```cpp
device.addProperty("main_light", "Main Light", "boolean", true, [](JsonVariant val) {
    digitalWrite(LED_BUILTIN, val.as<bool>() ? HIGH : LOW);
});
```

### Number Sliders & Enums (Modes)
You can restrict numbers with `min`/`max`/`step`, or provide `options` for dropdowns.

**Python:**
```python
device.add_property("fan_speed", "Fan Speed", "number", min_val=0, max_val=100, writable=True)
device.add_property("ac_mode", "AC Mode", "string", options=["AUTO", "COOL", "HEAT"], writable=True)
```

---

## 3. Stateless Actions

Actions are commands that do not represent continuous state (e.g., Reboot, Calibrate, Open Door).

**Python:**
```python
device.add_action("reboot", "Reboot Device", "Restarts hardware", on_execute=lambda params: reboot())
```

**Node.js:**
```javascript
device.addAction('reboot', 'Reboot Device', 'Restarts hardware', {}, (params) => reboot());
```

**Arduino:**
```cpp
device.addAction("reboot", "Reboot Device", "Restarts hardware", [](JsonObject params) {
    ESP.restart();
});
```

---

## 4. Execution & Updating State

Once your blueprint is defined, connect to the platform. To send telemetry, just call `update_property`—the SDK automatically batches and publishes the data.

### Python Example
```python
device.connect()

while True:
    temp = read_sensor()
    device.update_property("temperature", temp)
    time.sleep(5)
```

### Node.js Example
```javascript
device.connect();

setInterval(() => {
    let temp = readSensor();
    device.updateProperty('temperature', temp);
}, 5000);
```

### Arduino Example
```cpp
void setup() {
    device.begin();
}

void loop() {
    device.loop(); // Must be called continuously
    
    float temp = readSensor();
    device.updateProperty("temperature", temp);
}
```

---

## 5. Under the Hood
1. **Auto-Reconnect:** If the Wi-Fi or MQTT connection drops, the SDK will automatically attempt to reconnect every few seconds.
2. **Capability Sync:** Upon connection, the SDK automatically translates your blueprint into a JSON schema and publishes it to `devices/{id}/capabilities`, allowing the web dashboard to instantly render the correct UI elements.
3. **State Sync:** The SDK maintains a local cache. It only publishes telemetry when a property's value *actually changes* (unless you use `force_send=True`).
