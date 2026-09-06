# How to Connect an IoT Device

The primary purpose of the **MyDevice IoTConnector** is to hide repetitive IoT communication complexity (Wi-Fi management, MQTT connection, authentication, payload parsing, and reconnects) from hardware application developers.

Instead of writing boilerplate MQTT logic in every project, developers include the IoTConnector, configure it with the credentials they received from MyDevice, and focus purely on their sensor logic.

---

## 1. Register the Device on MyDevice

Before connecting a device, you must register it on the MyDevice platform:
1. Log into the MyDevice Dashboard.
2. Navigate to your Workspace -> **Devices**.
3. Click **Add Device**.
4. Once created, MyDevice will display two critical pieces of information:
   - **Device ID** (e.g., `DEV-A1B2C3`)
   - **Secret Key** (e.g., `super_secret_string`)

**Note:** The Secret Key acts as the device's password and will not be shown again. Save it securely.

---

## 2. Configure the IoTConnector

In your ESP32 or NodeMCU project, initialize the IoTConnector with your Wi-Fi credentials, MyDevice MQTT broker address, and the Device ID and Secret Key you just generated.

```cpp
#include "IoTConnector.h"

// Initialize connector
IoTConnector connector(
    "YOUR_WIFI_SSID", 
    "YOUR_WIFI_PASSWORD", 
    "mqtt.MyDevice.in",  // Broker IP/URL
    1883, 
    "DEV-A1B2C3",          // Device ID
    "super_secret_string"  // Secret Key
);

void setup() {
    connector.begin();
}

void loop() {
    connector.loop(); // Maintains connection and handles incoming commands
}
```

---

## 3. How Data Flows

### A. Publishing Telemetry
To send data to MyDevice, call the `publishTelemetry` method. The IoTConnector automatically formats the JSON and sends it to the correct topic (`devices/<DeviceID>/data`).

```cpp
float temp = dht.readTemperature();
connector.publishTelemetry("temperature", temp);
```

### B. Device Status & Heartbeats
The connector automatically manages connection status. When connected, it publishes to `devices/<DeviceID>/status`. If the device disconnects unexpectedly, the Mosquitto broker uses a Last Will and Testament (LWT) to notify MyDevice that the device is offline.

### C. Receiving Commands
MyDevice allows applications to send commands to devices. The IoTConnector automatically subscribes to `devices/<DeviceID>/command`.

You can register a callback in your firmware to handle these incoming commands:

```cpp
void onCommandReceived(String command, String payload) {
    if (command == "LED_ON") {
        digitalWrite(LED_PIN, HIGH);
    }
}

void setup() {
    connector.setCommandCallback(onCommandReceived);
    connector.begin();
}
```

---

## 4. Reconnect Behavior

The IoTConnector is designed to be resilient. If the Wi-Fi drops or the MQTT broker becomes temporarily unavailable, the `connector.loop()` function will automatically detect the drop and attempt a backoff-reconnection strategy until the connection is restored. You do not need to manually manage network state.
