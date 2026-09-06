# Project Scope

## Project Objective
The objective is to build a small, lightweight platform through which a user can register an IoT device and connect that device to our server using a reusable connector module.

## Exact Problem Being Solved
Developers face repetitive work implementing Wi-Fi, MQTT connections, device identification, authentication, topic handling, telemetry publishing, and reconnection logic for every new IoT device. This project solves this by abstracting these into a reusable device-side connector.

## In Scope
- Web platform for user registration and login.
- Device registration generating unique Device ID and Secret Key.
- Reusable device-side C/C++ connector module for ESP32/NodeMCU.
- MQTT communication for telemetry, status, and commands.
- Sensor data (Temperature, Humidity) storage.
- Web monitoring dashboard.
- Basic remote control capabilities (LED ON/OFF).
- REST API access.

## Out of Scope
*These features are explicitly marked as OUT OF SCOPE unless later approved:*
- Advanced enterprise platform features (competing with AWS IoT, ThingsBoard, etc.).
- Microservices, Kubernetes, complex Docker orchestration.
- Serverless architecture.
- Machine learning, edge AI, digital twins.
- Blockchain.
- Complicated event buses.
- Unnecessary third-party integrations.

## Target Users
Students, developers, and hobbyists looking to quickly integrate basic IoT devices without rewriting network boilerplate.

## Prototype Hardware
- **Primary controller:** ESP32 (Alternative: NodeMCU/ESP8266)
- **Sensors:** DHT11 or DHT22
- **Actuators:** LED

## Software Stack
- **Device:** C/C++ (Arduino framework)
- **Backend:** Node.js, Express.js
- **Database:** MySQL or PostgreSQL
- **Frontend:** React/Vite (or simple lightweight HTML/JS/CSS)
- **Broker:** Mosquitto (or equivalent simple MQTT broker)

## Minimum Viable Product
A system demonstrating device registration, connection via the reusable connector, telemetry reporting to the web dashboard, and remote actuation (LED toggle) from the dashboard.

## MVP Acceptance Criteria

The project will be considered successfully implemented when all of the following work:

- [ ] User can register/login.
- [ ] User can add an IoT device.
- [ ] Platform generates a unique Device ID.
- [ ] Platform generates a Secret Key.
- [ ] ESP32 can use the credentials through the reusable connector.
- [ ] ESP32 connects to Wi-Fi.
- [ ] ESP32 connects to MQTT.
- [ ] Valid device credentials are accepted.
- [ ] Invalid device credentials are rejected.
- [ ] ESP32 publishes real DHT temperature/humidity data.
- [ ] Backend receives telemetry.
- [ ] Backend stores telemetry in the database.
- [ ] Dashboard displays device status.
- [ ] Dashboard displays sensor data.
- [ ] Dashboard can send LED_ON.
- [ ] Physical LED turns ON.
- [ ] Dashboard can send LED_OFF.
- [ ] Physical LED turns OFF.
- [ ] Basic device reconnection works.

The MVP is intentionally limited to the features listed above. Additional features may be considered only after the MVP is working. A feature must not be added merely to make the project appear more advanced.
