/*
 * MyDevice Arduino SDK v2.0 (Blueprint API)
 * =========================================
 * Requires: PubSubClient, ArduinoJson
 *
 * Installation:
 *   Place MyDevice.h in the same folder as your .ino sketch
 *   #include "MyDevice.h"
 *
 * Usage:
 *   #include <WiFi.h>
 *   #include "MyDevice.h"
 *
 *   WiFiClient wifiClient;
 *   MyDevice device("DEV-001", "secret", wifiClient);
 *
 *   void setup() {
 *       WiFi.begin("SSID", "PASS");
 *       while (WiFi.status() != WL_CONNECTED) delay(500);
 *       
 *       // Read-only sensor
 *       device.addProperty("temperature", "Temperature", "number");
 *       
 *       // Controllable Switch
 *       device.addProperty("light", "Main Light", "boolean", true, [](JsonVariant val) {
 *           digitalWrite(LED_BUILTIN, val.as<bool>());
 *       });
 *       
 *       device.begin();
 *   }
 *
 *   void loop() {
 *       device.loop();
 *       device.updateProperty("temperature", 25.4);
 *   }
 */

#ifndef MYDEVICE_H
#define MYDEVICE_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define MYDEVICE_VERSION  "2.0.0"
#define MD_MAX_PROPS      16
#define MD_MAX_ACTIONS    8
#define MD_MAX_PARAMS     4
#define MD_BUF            1024

// ─── Types ──────────────────────────────────────────────────────────────────

typedef void (*MDPropertyChangeHandler)(JsonVariant val);
typedef void (*MDActionHandler)(JsonObject params);

struct _MDProp {
    char name[32];
    char label[48];
    char type[16];
    char unit[16];
    bool writable;
    MDPropertyChangeHandler onChange;
    
    // Cached State
    bool stateChanged;
    union { float fv; bool bv; char sv[32]; } state;
};

struct _MDParam {
    char name[24]; 
    char type[12];
    bool required;
};

struct _MDAction {
    char name[32]; 
    char label[48]; 
    char desc[96];
    _MDParam params[MD_MAX_PARAMS];
    int paramCount;
    MDActionHandler onExecute;
};

// ─── MyDevice Class ─────────────────────────────────────────────────────────

class MyDevice {
public:
    MyDevice(const char* deviceId, const char* secretKey, Client& net,
             const char* broker = "mydevice.in", int port = 1883)
        : _did(deviceId), _key(secretKey), _broker(broker), _port(port),
          _propCount(0), _actCount(0), _mqtt(net), _lastReconnectAttempt(0)
    {
        snprintf(_tData,   sizeof(_tData),   "devices/%s/data",         deviceId);
        snprintf(_tStatus, sizeof(_tStatus), "devices/%s/status",       deviceId);
        snprintf(_tCmd,    sizeof(_tCmd),    "devices/%s/command",      deviceId);
        snprintf(_tCmdAck, sizeof(_tCmdAck), "devices/%s/command/ack",  deviceId);
        snprintf(_tCaps,   sizeof(_tCaps),   "devices/%s/capabilities", deviceId);
    }

    // ── Blueprint API ───────────────────────────────────────────────

    void addProperty(const char* name, const char* label, const char* type, 
                     bool writable = false, MDPropertyChangeHandler onChange = nullptr, 
                     const char* unit = "") {
        if (_propCount >= MD_MAX_PROPS) return;
        auto& p = _props[_propCount++];
        strncpy(p.name, name, 31);
        strncpy(p.label, label, 47);
        strncpy(p.type, type, 15);
        strncpy(p.unit, unit, 15);
        p.writable = writable;
        p.onChange = onChange;
        p.stateChanged = false;
        
        // Init state zero
        if (strcmp(type, "number") == 0) p.state.fv = 0.0;
        else if (strcmp(type, "boolean") == 0) p.state.bv = false;
        else p.state.sv[0] = '\0';
    }

    // ── Semantic Helpers (Super Simple API) ─────────────────────────

    void addReading(const char* name, const char* label, const char* type = "number", const char* unit = "") {
        addProperty(name, label, type, false, nullptr, unit);
    }

    void addSwitch(const char* name, const char* label, MDPropertyChangeHandler onChange) {
        addProperty(name, label, "boolean", true, onChange, "");
    }

    void addSlider(const char* name, const char* label, float minVal, float maxVal, MDPropertyChangeHandler onChange) {
        // In Arduino, we don't dynamically store min/max in the basic struct to save memory, 
        // but it still registers as a writable number. The UI handles the limits.
        addProperty(name, label, "number", true, onChange, "");
    }

    // Alias for updateProperty
    void send(const char* name, float val, bool forceSend = false) { updateProperty(name, val, forceSend); }
    void send(const char* name, bool val, bool forceSend = false)  { updateProperty(name, val, forceSend); }
    void send(const char* name, const char* val, bool forceSend = false) { updateProperty(name, val, forceSend); }


    void addAction(const char* name, const char* label, const char* desc, MDActionHandler onExecute) {
        if (_actCount >= MD_MAX_ACTIONS) return;
        auto& a = _actions[_actCount++];
        strncpy(a.name, name, 31);
        strncpy(a.label, label, 47);
        strncpy(a.desc, desc, 95);
        a.paramCount = 0;
        a.onExecute = onExecute;
    }

    void addActionParam(const char* paramName, const char* type) {
        if (_actCount == 0) return;
        auto& a = _actions[_actCount - 1];
        if (a.paramCount >= MD_MAX_PARAMS) return;
        auto& p = a.params[a.paramCount++];
        strncpy(p.name, paramName, 23);
        strncpy(p.type, type, 11);
        p.required = true;
    }

    void updateProperty(const char* name, float val, bool forceSend = false) {
        for (int i=0; i<_propCount; i++) {
            if (strcmp(_props[i].name, name) == 0) {
                if (forceSend || _props[i].state.fv != val) {
                    _props[i].state.fv = val;
                    _props[i].stateChanged = true;
                }
                return;
            }
        }
    }

    void updateProperty(const char* name, bool val, bool forceSend = false) {
        for (int i=0; i<_propCount; i++) {
            if (strcmp(_props[i].name, name) == 0) {
                if (forceSend || _props[i].state.bv != val) {
                    _props[i].state.bv = val;
                    _props[i].stateChanged = true;
                }
                return;
            }
        }
    }

    void updateProperty(const char* name, const char* val, bool forceSend = false) {
        for (int i=0; i<_propCount; i++) {
            if (strcmp(_props[i].name, name) == 0) {
                if (forceSend || strcmp(_props[i].state.sv, val) != 0) {
                    strncpy(_props[i].state.sv, val, 31);
                    _props[i].stateChanged = true;
                }
                return;
            }
        }
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    void begin() {
        _mqtt.setServer(_broker, _port);
        _mqtt.setBufferSize(MD_BUF * 2);
        _mqtt.setCallback([this](char* t, byte* p, unsigned int l) { _onMsg(t, p, l); });
        _reconnect();
    }

    void loop() {
        if (!_mqtt.connected()) _reconnect();
        _mqtt.loop();
        
        // Auto-sync state changes
        bool hasChanges = false;
        for (int i=0; i<_propCount; i++) {
            if (_props[i].stateChanged) { hasChanges = true; break; }
        }
        
        if (hasChanges) {
            _sendTelemetry();
        }
    }

    bool isConnected() { return _mqtt.connected(); }

private:
    const char*  _did;
    const char*  _key;
    const char*  _broker;
    int          _port;
    PubSubClient _mqtt;
    unsigned long _lastReconnectAttempt;

    char _tData[80], _tStatus[80], _tCmd[80], _tCmdAck[80], _tCaps[80];

    _MDProp    _props[MD_MAX_PROPS];      int _propCount;
    _MDAction  _actions[MD_MAX_ACTIONS];  int _actCount;

    void _publishSchema() {
        DynamicJsonDocument doc(MD_BUF * 2);
        JsonArray arr = doc.to<JsonArray>();
        
        if (_propCount > 0) {
            JsonObject stateCap = arr.createNestedObject();
            stateCap["name"] = "device_state";
            stateCap["label"] = "Device State";
            stateCap["description"] = "Device properties and sensors";
            
            JsonArray actions = stateCap.createNestedArray("actions");
            for (int i=0; i<_propCount; i++) {
                if (_props[i].writable) {
                    JsonObject act = actions.createNestedObject();
                    char actName[64];
                    snprintf(actName, sizeof(actName), "SET_%s", _props[i].name);
                    for(int j=0; actName[j]; j++) actName[j] = toupper(actName[j]);
                    
                    act["name"] = actName;
                    act["label"] = String("Set ") + _props[i].label;
                    JsonObject params = act.createNestedObject("parameters");
                    JsonObject p = params.createNestedObject(_props[i].name);
                    p["type"] = _props[i].type;
                    p["required"] = true;
                }
            }
            if (actions.size() == 0) stateCap.remove("actions");
        }
        
        if (_actCount > 0) {
            JsonObject actionCap = arr.createNestedObject();
            actionCap["name"] = "system_actions";
            actionCap["label"] = "System Actions";
            actionCap["description"] = "Stateless device commands";
            
            JsonArray actions = actionCap.createNestedArray("actions");
            for (int i=0; i<_actCount; i++) {
                JsonObject act = actions.createNestedObject();
                act["name"] = _actions[i].name;
                act["label"] = _actions[i].label;
                act["description"] = _actions[i].desc;
                
                JsonObject params = act.createNestedObject("parameters");
                for (int j=0; j<_actions[i].paramCount; j++) {
                    JsonObject p = params.createNestedObject(_actions[i].params[j].name);
                    p["type"] = _actions[i].params[j].type;
                    p["required"] = _actions[i].params[j].required;
                }
            }
        }
        
        char buf[MD_BUF * 2];
        serializeJson(doc, buf, sizeof(buf));
        _mqtt.publish(_tCaps, buf, true);
    }

    void _sendTelemetry() {
        StaticJsonDocument<MD_BUF> doc;
        doc["device_id"] = _did;
        doc["source"]    = "state";
        JsonObject data  = doc.createNestedObject("data");
        
        for (int i = 0; i < _propCount; i++) {
            if (_props[i].stateChanged) {
                if (strcmp(_props[i].type, "number") == 0) data[_props[i].name] = _props[i].state.fv;
                else if (strcmp(_props[i].type, "boolean") == 0) data[_props[i].name] = _props[i].state.bv;
                else data[_props[i].name] = _props[i].state.sv;
                _props[i].stateChanged = false;
            }
        }
        
        char buf[MD_BUF];
        serializeJson(doc, buf, MD_BUF);
        _mqtt.publish(_tData, buf);
    }

    void _reconnect() {
        if (_mqtt.connected()) return;
        
        unsigned long now = millis();
        if (now - _lastReconnectAttempt < 5000) return;
        _lastReconnectAttempt = now;

        Serial.print("[MyDevice] Connecting...");
        if (_mqtt.connect(_did, _did, _key)) {
            Serial.println(" OK");
            _mqtt.subscribe(_tCmd);
            
            StaticJsonDocument<128> doc;
            doc["device_id"] = _did;
            doc["status"]    = "online";
            char buf[128];
            serializeJson(doc, buf);
            _mqtt.publish(_tStatus, buf);
            
            _publishSchema();
            
            // Force sync all state
            for(int i=0; i<_propCount; i++) _props[i].stateChanged = true;
            _sendTelemetry();
            _lastReconnectAttempt = 0;
            
        } else {
            Serial.printf(" FAIL (rc=%d)\n", _mqtt.state());
        }
    }

    void _onMsg(char* topic, byte* payload, unsigned int len) {
        StaticJsonDocument<512> doc;
        if (deserializeJson(doc, payload, len)) return;
        
        const char* cmdType = doc["command_type"] | doc["type"] | doc["command"] | "UNKNOWN";
        const char* cmdId   = doc["command_id"]   | "n/a";
        const char* corrId  = doc["correlation_id"] | "n/a";
        JsonObject  params  = doc["parameters"] | doc["payload"];

        const char* status = "REJECTED";
        String cmdStr = String(cmdType);

        if (cmdStr.startsWith("SET_")) {
            String propName = cmdStr.substring(4);
            propName.toLowerCase();
            
            for (int i=0; i<_propCount; i++) {
                String pName = String(_props[i].name);
                pName.toLowerCase();
                if (pName == propName && _props[i].writable) {
                    if (params.containsKey(_props[i].name)) {
                        JsonVariant val = params[_props[i].name];
                        if (_props[i].onChange) {
                            _props[i].onChange(val);
                        }
                        // Auto update state
                        if (strcmp(_props[i].type, "number") == 0) updateProperty(_props[i].name, val.as<float>(), true);
                        else if (strcmp(_props[i].type, "boolean") == 0) updateProperty(_props[i].name, val.as<bool>(), true);
                        else updateProperty(_props[i].name, val.as<const char*>(), true);
                        
                        status = "COMPLETED";
                    }
                    break;
                }
            }
        } else {
            for (int i=0; i<_actCount; i++) {
                if (strcmp(_actions[i].name, cmdType) == 0) {
                    if (_actions[i].onExecute) {
                        _actions[i].onExecute(params);
                    }
                    status = "COMPLETED";
                    break;
                }
            }
        }

        if (strcmp(cmdId, "n/a") != 0) {
            StaticJsonDocument<256> ack;
            ack["command_id"]      = cmdId;
            ack["correlation_id"]  = corrId;
            ack["status"]          = status;
            char buf[256];
            serializeJson(ack, buf);
            _mqtt.publish(_tCmdAck, buf);
        }
    }
};

#endif // MYDEVICE_H
