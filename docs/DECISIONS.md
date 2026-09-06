# Decisions

## Initial Decisions (Phase 0)

1. **Hardware:** ESP32 is the primary prototype controller.
2. **Sensor:** DHT11/DHT22 is the initial sensor.
3. **Actuator:** LED is the initial actuator.
4. **Communication:** MQTT is the primary IoT communication protocol.
5. **Backend:** Node.js/Express is the backend.
6. **Database:** MySQL/PostgreSQL is the database.
7. **Architecture:** The architecture is intentionally monolithic for simplicity.
8. **Connector:** A reusable connector module is a core project feature.
9. **Scope Limit:** Advanced enterprise features are out of scope.
10. **Process:** Development will proceed phase by phase.
11. **MVP-first development:** Advanced features will not be implemented before the minimum viable system is working.
12. **MQTT authentication:** The final Mosquitto authentication mechanism will be selected during implementation based on the simplest reliable approach.
13. **Security level:** The college prototype provides basic security; production-grade security is outside the current scope.
14. **Testing rule:** No performance numbers or results will be claimed until they are measured from the actual implementation.

*If any changes are required in the future, record the original decision, new decision, reason, and impact here.*
