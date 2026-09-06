#include <MyDeviceSite.h>

MyDeviceSite device;

void setup() {
    Serial.begin(115200);
    device.begin("YOUR_SSID", "YOUR_WIFI_PASSWORD", "DEV-001-XXXX", "[REDACTED_SECRET_KEY]");

    // The library automatically publishes this configuration to devices/{DEVICE_ID}/capabilities
    // whenever it successfully connects to the MQTT broker.
    
    // Group 1: General
    device.addCapability("General", "control");
    
    // Boolean switch
    device.addAction("General", "SET_POWER", "Power Switch");
    device.addBooleanParam("SET_POWER", "status");
    
    // Dropdown options
    device.addAction("General", "SET_MODE", "Operation Mode");
    device.addEnumParam("SET_MODE", "mode", "AUTO,COOL,HEAT,DRY");

    // Group 2: Advanced
    device.addCapability("Advanced Settings");
    
    // Number slider (min=10, max=30, step=0.5)
    device.addAction("Advanced Settings", "SET_TARGET_TEMP", "Target Temperature");
    device.addNumberParam("SET_TARGET_TEMP", "target", 10.0f, 30.0f, 0.5f);
    
    // Free text input
    device.addAction("Advanced Settings", "SET_NAME", "Rename Device");
    device.addTextParam("SET_NAME", "name");
}

void loop() {
    device.loop();
}
