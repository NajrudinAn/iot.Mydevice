#ifndef CONFIG_H
#define CONFIG_H

// Simulation Mode (true = Software Simulation, false = Real Hardware)
#define IOT_SIMULATION_MODE true

// IoT Connector Configuration Defaults
#define DEFAULT_WIFI_SSID "YOUR_WIFI_SSID"
#define DEFAULT_WIFI_PASS "YOUR_WIFI_PASSWORD"
#define DEFAULT_DEVICE_ID "YOUR_DEVICE_ID"
#define DEFAULT_SECRET_KEY "YOUR_SECRET_KEY"
#define DEFAULT_DEVICE_NAME "ESP32 Sensor Node"

#define MQTT_BROKER "192.168.1.100" // Change to backend IP
#define MQTT_PORT 1883

// Telemetry Interval (milliseconds)
#define TELEMETRY_INTERVAL 5000

// Hardware Pins (Only used if IOT_SIMULATION_MODE == false)
#define DHT_PIN 4
#define DHT_TYPE 11 // (11 for DHT11, 22 for DHT22)
#define LED_PIN 2

#endif
