#include "sensor.h"

void SensorModule::begin() {
    if (IOT_SIMULATION_MODE) {
        Serial.println("[Sensor] Initializing SIMULATED DHT Sensor");
        _simTemp = 25.0;
        _simHum = 50.0;
    } else {
        Serial.println("[Sensor] Initializing REAL DHT Sensor on Pin " + String(DHT_PIN));
        // Real hardware logic would go here (e.g., dht.begin())
    }
}

bool SensorModule::read(float &temperature, float &humidity) {
    if (IOT_SIMULATION_MODE) {
        // Generate realistic drifting values
        _simTemp += random(-5, 6) / 10.0;
        _simHum += random(-20, 21) / 10.0;
        
        // Clamp values to realistic ranges
        if (_simTemp < -10) _simTemp = -10;
        if (_simTemp > 60) _simTemp = 60;
        if (_simHum < 0) _simHum = 0;
        if (_simHum > 100) _simHum = 100;
        
        temperature = _simTemp;
        humidity = _simHum;
        return true;
    } else {
        // Real hardware logic would go here (e.g., dht.readTemperature())
        // Return false if read fails to trigger retry log.
        return false;
    }
}
