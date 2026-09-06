#ifndef ACTUATOR_H
#define ACTUATOR_H

#include "config.h"
#include <Arduino.h>

class ActuatorModule {
public:
    void begin();
    void setLed(bool state);
    bool getLedState();

private:
    bool _ledState;
};

#endif
