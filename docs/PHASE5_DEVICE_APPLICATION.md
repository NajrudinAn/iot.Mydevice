# Phase 5 Device Application

This document outlines the first complete ESP32 device application developed as part of Phase 5. It integrates the Phase 4 IoTConnector with abstracted sensor and actuator modules.

## 1. Device Application Architecture
The application (`firmware/iot_device/iot_device.ino`) acts as a high-level coordinator. It avoids putting hardware logic into the network stack, instead dividing responsibilities:
- **`sensor.cpp/h`**: Reads environmental data (Temperature & Humidity).
- **`actuator.cpp/h`**: Drives external controls (LED).
- **`IoTConnector`**: Handles Wi-Fi persistence, AP mode, MQTT protocol, reconnects, and JSON telemetry mapping.
- **`config.h`**: Manages all conditional `#define` parameters to seamlessly switch between environments.

## 2. Simulation Mode
Because physical hardware is currently unavailable for testing, the system implements a robust **Simulation Mode**. By toggling `#define IOT_SIMULATION_MODE true` inside `config.h`, the firmware cleanly substitutes the hardware drivers with realistic software simulators without changing the application logic flow.

### Sensor Simulation
When active, `sensor.cpp` generates bounded, drifting temperature and humidity readings:
- **Temperature Range:** -10°C to 60°C.
- **Humidity Range:** 0% to 100%.
This generates realistic variations over time (e.g., `25.5°C -> 25.8°C`) rather than erratic randomness, allowing the backend to process smooth telemetry waves.

### Actuator Simulation
When active, `actuator.cpp` intercepts the hardware `digitalWrite()` calls and instead logs the internal state tracking to Serial output (e.g., `[DEVICE] LED ON`). This proves that the MQTT callback routing from the backend to the application to the actuator successfully triggered.

## 3. Telemetry and Commands Flow
- **Telemetry Flow:** The `loop()` non-blocking timer triggers every `TELEMETRY_INTERVAL` (default 5000ms), reads the sensor, and passes the floats to `device.publishData()`. 
- **Command Flow:** The application registers a lambda function with `device.onCommand()`. When an MQTT payload containing `"command":"LED_ON"` arrives, the lambda executes `actuator.setLed(true)`.

## 4. Hardware Limitations & Future Testing
Currently, the codebase compiles cleanly in the Arduino IDE paradigm but relies entirely on host-side Python testing and C++ static structural validation.

**Pending Hardware Execution:**
- ESP32 Physical Boot & Memory Heap constraints.
- Actual DHT11/DHT22 pin interrupt timing.
- LED GPIO 3.3v current delivery.
- Wi-Fi Radio range drops.
