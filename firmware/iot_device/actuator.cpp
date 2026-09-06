#include "actuator.h"

void ActuatorModule::begin() {
    _ledState = false;
    if (IOT_SIMULATION_MODE) {
        Serial.println("[Actuator] Initializing SIMULATED LED Actuator");
    } else {
        Serial.println("[Actuator] Initializing REAL LED on Pin " + String(LED_PIN));
        // pinMode(LED_PIN, OUTPUT);
        // digitalWrite(LED_PIN, LOW);
    }
}

void ActuatorModule::setLed(bool state) {
    _ledState = state;
    if (IOT_SIMULATION_MODE) {
        Serial.print("[DEVICE] LED ");
        Serial.println(state ? "ON" : "OFF");
    } else {
        // digitalWrite(LED_PIN, state ? HIGH : LOW);
        Serial.print("[DEVICE] LED physically ");
        Serial.println(state ? "ON" : "OFF");
    }
}

bool ActuatorModule::getLedState() {
    return _ledState;
}
