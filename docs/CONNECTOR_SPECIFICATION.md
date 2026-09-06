# Connector Specification

The Reusable IoT Connector is a small, lightweight C/C++ module for the ESP32 (or NodeMCU) that abstracts the boilerplate network logic.

## Connector Interface (C++ for ESP32)

### Basic Usage & Configuration
```cpp
#include <IoTConnector.h>

IoTConnector device;

void setup() {
    // Optional Web Server for local Wi-Fi / Device configuration
    device.config.enableWebConfig = true;
    device.config.enableAPMode = true;

    device.setServer("192.168.1.100", 1883);

    // Initial defaults (overridden by Web Configuration if saved)
    device.begin(
        "WIFI_SSID", 
        "WIFI_PASS", 
        "DEVICE_ID", 
        "SECRET_KEY"
    );
}
```

### Local Wi-Fi Configuration
If the device fails to connect to the saved Wi-Fi, it enters **AP Fallback Mode** (e.g. `IoT-Device-A1B2`). 
The user can connect using password `setup123`, navigate to the local IP address, and configure the device ID, Wi-Fi credentials, and secret key via a password-protected HTML form. This configuration is stored securely in ESP32 `Preferences` non-volatile memory.

## Responsibilities
- **Wi-Fi Connection:** Connects to the local network using provided SSID and password.
- **MQTT Connection:** Connects to the central broker.
- **Authentication:** Uses the Device ID as the client ID/username and the Secret Key for the connection password.

## Authentication
The exact broker authentication mechanism is established. The connector must use the provided `Device ID` as the MQTT client identity and username, and the `Secret Key` as the MQTT password. The broker enforces topic isolation using ACLs.

### Initialization
```cpp
void begin(const char* ssid, const char* pass, const char* deviceId, const char* secretKey);
```

- **Telemetry Publishing:** Exposes a simple function to format and send JSON telemetry.
- **Command Reception:** Subscribes to the device's command topic and triggers an application callback.
- **Status Reporting:** Uses MQTT Last Will and Testament (LWT) and active status publishes to report if the device is online/offline.
- **Reconnection:** Automatically attempts to reconnect if the Wi-Fi or MQTT connection drops.

## Developer Experience
The application developer should **not** need to implement:
- The PubSubClient or WiFiClient directly.
- The JSON string formatting for basic messages.
- The MQTT reconnection loop.
- The topic string concatenation.

The developer **should** only need to:
- Initialize the connector with credentials.
- Call `loop()` in their main loop.
- Use simple methods like `iot.publishData(...)`.
- Provide a callback for received commands like `iot.onCommand(...)`.
