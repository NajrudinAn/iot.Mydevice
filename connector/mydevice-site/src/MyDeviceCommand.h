#ifndef MYDEVICE_COMMAND_H
#define MYDEVICE_COMMAND_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <math.h>

class MyDeviceCommand {
public:
    MyDeviceCommand(const char* actionName, JsonVariantConst payload) 
        : _actionName(actionName), _payload(payload) {}

    const char* actionName() const { return _actionName; }

    bool hasParam(const char* key) const {
        return _payload.containsKey(key);
    }

    bool getBool(const char* key, bool defaultValue = false) const {
        if (!_payload.containsKey(key)) return defaultValue;
        JsonVariantConst v = _payload[key];
        if (v.is<bool>()) return v.as<bool>();
        if (v.is<const char*>()) {
            String s = v.as<const char*>();
            s.toLowerCase();
            s.trim();
            if (s == "true" || s == "1" || s == "on") return true;
            if (s == "false" || s == "0" || s == "off") return false;
            Serial.print("[MyDevice] WARN: Invalid boolean string for '"); Serial.print(key); Serial.println("'");
            return defaultValue;
        }
        if (v.is<int>()) {
            int val = v.as<int>();
            if (val == 1) return true;
            if (val == 0) return false;
        }
        Serial.print("[MyDevice] WARN: Invalid boolean type/value for '"); Serial.print(key); Serial.println("'");
        return defaultValue;
    }

    float getNumber(const char* key, float defaultValue = 0.0f) const {
        if (!_payload.containsKey(key)) return defaultValue;
        JsonVariantConst v = _payload[key];
        float val = 0.0f;
        bool valid = false;

        if (v.is<float>() || v.is<int>()) {
            val = v.as<float>();
            valid = true;
        } else if (v.is<const char*>()) {
            String s = v.as<const char*>();
            s.trim();
            if (s.length() > 0) {
                char* endptr;
                val = strtof(s.c_str(), &endptr);
                if (*endptr == '\0') {
                    valid = true;
                }
            }
        }
        
        if (!valid || isnan(val) || isinf(val)) {
            Serial.print("[MyDevice] WARN: Invalid numeric value for '"); Serial.print(key); Serial.println("'");
            return defaultValue;
        }
        return val;
    }
    
    int getInt(const char* key, int defaultValue = 0) const {
        if (!_payload.containsKey(key)) return defaultValue;
        JsonVariantConst v = _payload[key];
        long val = 0;
        bool valid = false;

        if (v.is<int>()) {
            val = v.as<long>();
            valid = true;
        } else if (v.is<const char*>()) {
            String s = v.as<const char*>();
            s.trim();
            if (s.length() > 0) {
                char* endptr;
                val = strtol(s.c_str(), &endptr, 10);
                if (*endptr == '\0') {
                    valid = true;
                }
            }
        }
        
        if (!valid) {
            Serial.print("[MyDevice] WARN: Invalid integer value for '"); Serial.print(key); Serial.println("'");
            return defaultValue;
        }
        return (int)val;
    }

    const char* getString(const char* key, const char* defaultValue = "") const {
        if (!_payload.containsKey(key)) return defaultValue;
        JsonVariantConst v = _payload[key];
        if (v.is<const char*>()) return v.as<const char*>();
        Serial.print("[MyDevice] WARN: Expected string for '"); Serial.print(key); Serial.println("'");
        return defaultValue;
    }

private:
    const char* _actionName;
    JsonVariantConst _payload;
};

#endif
