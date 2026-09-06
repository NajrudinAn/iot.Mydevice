#ifndef SENSOR_H
#define SENSOR_H

#include "config.h"
#include <Arduino.h>

class SensorModule {
public:
    void begin();
    bool read(float &temperature, float &humidity);

private:
    float _simTemp;
    float _simHum;
};

#endif
