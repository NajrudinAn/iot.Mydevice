#include <MyDeviceSite.h>

MyDeviceSite device;

void setup() {
    Serial.begin(115200);
    device.begin("YOUR_SSID", "YOUR_WIFI_PASSWORD", "DEV-001-XXXX", "[REDACTED_SECRET_KEY]");
}

void loop() {
    device.loop();

    // Publish telemetry every 2 seconds
    static unsigned long lastTelemetry = 0;
    if (millis() - lastTelemetry > 2000) {
        lastTelemetry = millis();
        
        if (device.isMqttConnected()) {
            device.publishTelemetry("temperature", 24.5f);
            device.publishTelemetry("humidity", 50.2f);
            device.publishTelemetry("light_status", true);
            device.publishTelemetry("custom_status", "Active");
            Serial.println("Published telemetry");
        }
    }
}
