#include <MyDeviceSite.h>

MyDeviceSite device;

void setup() {
    Serial.begin(115200);
    device.begin("YOUR_SSID", "YOUR_WIFI_PASSWORD", "DEV-001-XXXX", "[REDACTED_SECRET_KEY]");

    // Simple handler that demonstrates parameter extraction
    device.onCommand("PRINT_MESSAGE", [](const MyDeviceCommand& cmd) {
        String msg = cmd.getString("message", "Default Hello");
        Serial.print("Received message: ");
        Serial.println(msg);
    });

    // Handler with multiple parameter types
    device.onCommand("CONFIG_UPDATE", [](const MyDeviceCommand& cmd) {
        bool enable = cmd.getBool("enable", false);
        int timeout = cmd.getInt("timeout", 30);
        float threshold = cmd.getNumber("threshold", 0.5f);
        
        Serial.println("Config updated:");
        Serial.println(enable ? " Enabled" : " Disabled");
        Serial.print(" Timeout: "); Serial.println(timeout);
        Serial.print(" Threshold: "); Serial.println(threshold);
    });
}

void loop() {
    device.loop();
}
