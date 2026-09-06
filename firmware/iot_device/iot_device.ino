#include <Arduino.h>
#include <IoTConnector.h>
#include "config.h"
#include "sensor.h"
#include "actuator.h"

IoTConnector device;
SensorModule sensor;
ActuatorModule actuator;

unsigned long lastTelemetryTime = 0;

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- IoT Device Application Start ---");
    
    // 1. Initialize Submodules
    sensor.begin();
    actuator.begin();
    
    // 2. Configure Connector
    device.config.enableWebConfig = true;
    device.config.enableAPMode = true;
    device.config.defaultDeviceName = DEFAULT_DEVICE_NAME;
    
    device.setServer(MQTT_BROKER, MQTT_PORT);
    
    // 3. Register Command Callback
    device.onCommand([](const char* command) {
        if (strcmp(command, "LED_ON") == 0) {
            actuator.setLed(true);
        } else if (strcmp(command, "LED_OFF") == 0) {
            actuator.setLed(false);
        } else {
            Serial.print("[App] Unknown command: ");
            Serial.println(command);
        }
    });

    // 4. Start IoT Connector (Initiates Wi-Fi & MQTT)
    device.begin(
        DEFAULT_WIFI_SSID,
        DEFAULT_WIFI_PASS,
        DEFAULT_DEVICE_ID,
        DEFAULT_SECRET_KEY
    );
}

void loop() {
    // 1. Process Network, Web Server, and MQTT queues
    device.loop();

    // 2. Check Telemetry Interval
    if (device.connected()) {
        unsigned long now = millis();
        if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
            lastTelemetryTime = now;
            
            // 3. Read Sensor
            float temperature, humidity;
            if (sensor.read(temperature, humidity)) {
                // 4. Publish Telemetry
                Serial.print("[App] Publishing Telemetry - Temp: ");
                Serial.print(temperature);
                Serial.print("C, Hum: ");
                Serial.print(humidity);
                Serial.println("%");
                
                device.publishData(temperature, humidity);
            } else {
                Serial.println("[App] Failed to read from sensor!");
            }
        }
    }
}
