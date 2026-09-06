# MyDevice Site - Arduino C++ Client Library

A complete, production-quality, long-term reusable C++ library for connecting ESP32 and NodeMCU-class devices to the MyDevice IoT Platform.

## Features

- **Automated Wi-Fi Management**: Built-in fallback to Access Point (AP) mode for headless Wi-Fi configuration.
- **Robust MQTT Support**: Handles connection, subscriptions, Last Will and Testament (LWT) for true online/offline tracking, and backoff reconnections.
- **Dynamic Capabilities UI**: Easily register custom device capabilities (switches, sliders, dropdowns) directly from C++ which automatically render on the MyDevice web dashboard.
- **Type-Safe Command Handling**: A streamlined `onCommand` API to safely parse incoming JSON instructions without dealing with parsing errors or temporary objects.
- **Telemetry Publishing**: Clean API to publish sensor readings instantly.
- **Bounded Memory**: Built on ArduinoJson 7, avoiding memory leaks and keeping resource usage deterministic on embedded devices.
- **Backward Compatibility**: Fully backward compatible with legacy projects using `IoTConnector.h`.

## Dependencies

You must install the following libraries in your Arduino IDE (`Sketch -> Include Library -> Manage Libraries`):
1. **PubSubClient** (by Nick O'Leary)
2. **ArduinoJson** (v7.x, by Benoit Blanchon)

## Quick Start

```cpp
#include <MyDeviceSite.h>

MyDeviceSite device;

void setup() {
    Serial.begin(115200);

    // device.begin(SSID, PASSWORD, DEVICE_ID, SECRET_KEY)
    device.begin("WIFI_SSID", "WIFI_PASS", "DEV-001-XXXX", "YOUR_SECRET_KEY");

    // Add a simple capability (Dashboard toggle switch)
    device.addCapability("Light Control");
    device.addAction("Light Control", "SET_LIGHT", "Toggle Light");
    device.addBooleanParam("SET_LIGHT", "status");

    // Handle commands safely
    device.onCommand("SET_LIGHT", [](const MyDeviceCommand& cmd) {
        bool status = cmd.getBool("status");
        Serial.println(status ? "ON" : "OFF");
        
        // Report state back to dashboard
        device.publishTelemetry("light_status", status);
    });
}

void loop() {
    device.loop();
}
```

## Legacy Support

If you have an old project using `IoTConnector`, you only need to install `mydevice-site` and `ArduinoJson`, then recompile. Your `#include <IoTConnector.h>` and `publishData()` calls will automatically map to the new robust engine without modification.

## Security Considerations

- **Secret Keys**: Ensure your `SECRET_KEY` is not logged to `Serial` inside your sketches. The library strictly avoids printing secrets.
- **Captive Portal**: In AP mode, the configuration portal uses a default setup password. For production use, you should modify the captive portal password via `device.config.defaultConfigPassword`.

## Tested Targets

This library is primarily designed for and explicitly tested against:
- **ESP32** (via Arduino Core for ESP32)

## Limitations & Reporting
- The maximum number of `onCommand` handlers is currently capped at 20 to preserve deterministic memory.
- If multiple commands arrive rapidly, they are dispatched sequentially based on the `PubSubClient` internal buffer. Oversized MQTT payloads (larger than PubSubClient's `MQTT_MAX_PACKET_SIZE`, typically 256 bytes) will be dropped unless the buffer is increased.
