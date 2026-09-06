#include <IoTConnector.h>

IoTConnector device;

void setup() {
    Serial.begin(115200);

    // Legacy sketches used IoTConnector exactly like this
    device.begin("YOUR_SSID", "YOUR_WIFI_PASSWORD", "DEV-001-XXXX", "YOUR_SECRET_KEY");
}

void loop() {
    device.loop();

    // Legacy method for publishing temperature and humidity
    static unsigned long lastTime = 0;
    if (millis() - lastTime > 5000) {
        lastTime = millis();
        device.publishData(22.5, 45.0);
    }
}
