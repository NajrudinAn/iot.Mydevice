# Reusable IoT Connector Module

The `IoTConnector` is a lightweight, reusable C++ library designed for ESP32 and Arduino-compatible boards. It abstracts away the boilerplate code required to connect an IoT device to the College IoT Platform, handling Wi-Fi, MQTT Authentication, Topic Generation, Telemetry, and Reconnection logic automatically.

## Why it exists
Instead of writing complex MQTT authentication, topic string manipulation, and connection loops for every new sensor project, a developer can simply include this library and focus on reading sensors and controlling actuators.

## Supported Hardware
- **Primary:** ESP32
- **Dependencies:** `WiFi.h`, `PubSubClient.h`

## Configuration
Before initializing, obtain your credentials from the IoT Dashboard:
- **Device ID:** (e.g., `DEV-001`)
- **Secret Key:** (Generated securely by the platform)

*Note: The platform broker runs locally. You must specify the IP address of the machine running the backend.*

## Basic Usage

```cpp
#include <IoTConnector.h>

IoTConnector device;

void setup() {
    // Optional: Web configuration settings
    device.config.enableWebConfig = true;
    device.config.enableAPMode = true;

    device.setServer("192.168.1.100", 1883); // Backend IP

    device.onCommand([](const char* command) {
        if (strcmp(command, "LED_ON") == 0) {
            // Turn LED On
        }
    });

    device.begin(
        "WIFI_SSID",        // Optional defaults
        "WIFI_PASSWORD",
        "DEV-001",
        "YOUR_SECRET_KEY"
    );
}

void loop() {
    device.loop();
    
    if (device.connected()) {
        device.publishData(25.5, 60.2); // temp, humidity
    }
}
```

## Wi-Fi Setup & Access Point Mode
If the device fails to connect to Wi-Fi or no credentials exist, it will start a temporary Access Point (e.g. `IoT-Device-A1B2`).
- **Initial Password**: `setup123`

## Local Configuration Page
While in AP mode, or connected to the normal Wi-Fi, you can access the configuration page at the device's IP address (port 80).
- Go to `http://<IP_ADDRESS>` to view device status.
- Go to `http://<IP_ADDRESS>/config` to update Wi-Fi, Device ID, Secret Key, and passwords.

## Configuration Password
By default, the configuration page requires a username/password.
- **Username:** `admin`
- **Default Password:** `admin`
*(You can change this password in the Configuration page)*

## Factory Reset
Visit `http://<IP_ADDRESS>/config` and click **Factory Reset** to erase all saved preferences and restart in AP mode.

## Enable/Disable Web Configuration
If you don't need the local web server, simply disable it in `setup()`:
```cpp
device.config.enableWebConfig = false;
```

## Security Notes
- **Never hardcode real credentials in public repositories.**
- TLS is not enabled in the current local prototype. Production deployment should use encrypted MQTT transport.
- The `Secret Key` is treated as the MQTT password and must be kept secure.
