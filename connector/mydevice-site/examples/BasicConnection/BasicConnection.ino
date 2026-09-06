#include <MyDeviceSite.h>

MyDeviceSite device;

void setup() {
    Serial.begin(115200);

    // device.begin(SSID, PASSWORD, DEVICE_ID, SECRET_KEY)
    // You can leave SSID and PASSWORD empty if you prefer to use the Web-based Access Point configuration.
    device.begin("YOUR_SSID", "YOUR_WIFI_PASSWORD", "DEV-001-XXXX", "YOUR_SECRET_KEY");
}

void loop() {
    // Required to process MQTT messages and maintain the connection
    device.loop();
}
