#include <MyDeviceSite.h>

MyDeviceSite device;

// Hardware pins
const int LED_PIN = 2;
const int FAN_PIN = 4;

// Local state
bool lightStatus = false;
int fanSpeed = 0;

void setup() {
    Serial.begin(115200);

    // Optional: Overwrite default mqtt broker 
    // device.setServer("mqtt.MyDevice.in", 1883); // Optional custom broker

    device.begin("YOUR_SSID", "YOUR_WIFI_PASSWORD", "DEV-001-XXXX", "[REDACTED_SECRET_KEY]");

    pinMode(LED_PIN, OUTPUT);
    pinMode(FAN_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    digitalWrite(FAN_PIN, LOW);

    // 1. Declare Capabilities for the Dashboard UI
    device.addCapability("Light Control", "control");
    device.addAction("Light Control", "SET_LIGHT", "Toggle Light", "Turn the smart light on or off");
    device.addBooleanParam("SET_LIGHT", "status");

    device.addCapability("Fan Control", "control");
    device.addAction("Fan Control", "SET_FAN_SPEED", "Set Fan Speed", "Adjust the fan speed (0-3)");
    device.addNumberParam("SET_FAN_SPEED", "speed", 0, 3, 1);

    // 2. Register Command Handlers
    device.onCommand("SET_LIGHT", [](const MyDeviceCommand& cmd) {
        // Safely extract the boolean, handles string conversions automatically
        lightStatus = cmd.getBool("status");
        
        digitalWrite(LED_PIN, lightStatus ? HIGH : LOW);
        Serial.println(lightStatus ? "Light turned ON" : "Light turned OFF");

        // Immediately update the dashboard state
        device.publishTelemetry("light_status", lightStatus);
    });

    device.onCommand("SET_FAN_SPEED", [](const MyDeviceCommand& cmd) {
        fanSpeed = cmd.getInt("speed");
        
        if (fanSpeed > 0) {
            digitalWrite(FAN_PIN, HIGH);
        } else {
            digitalWrite(FAN_PIN, LOW);
        }
        Serial.print("Fan speed set to: ");
        Serial.println(fanSpeed);

        // Update dashboard
        device.publishTelemetry("fan_speed", fanSpeed);
    });
}

void loop() {
    device.loop();

    // Publish telemetry every 5 seconds
    static unsigned long lastTelemetry = 0;
    if (millis() - lastTelemetry > 5000) {
        lastTelemetry = millis();
        
        if (device.isMqttConnected()) {
            float temperature = 22.5 + (random(-10, 10) / 10.0);
            float humidity = 45.0 + (random(-10, 10) / 10.0);
            
            // Publish structured telemetry
            device.publishTelemetry("temperature", temperature);
            device.publishTelemetry("humidity", humidity);
        }
    }
}
