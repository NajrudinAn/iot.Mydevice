/*
 * MyDevice Arduino SDK v2.0.1 (Blueprint API)
 * ===========================================
 * Requires: PubSubClient, ArduinoJson v7
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
 *       
 *       // Read-only sensor
 *       device.addReading("temperature", "Temperature", "number", "°C");
 *       
 *       // Controllable Switch
 *       device.addSwitch("light", "Main Light", [](bool val) {
 *           digitalWrite(LED_BUILTIN, val ? HIGH : LOW);
 *       });
 *       
 *       device.begin();
 *   }
 *
 *   void loop() {
 *       device.loop();
 *       // Physical hardware updates will be synced automatically:
 *       // device.send("temperature", 25.4);
 *   }
 */

#ifndef MYDEVICE_H
#define MYDEVICE_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#elif defined(ESP32)
#include <WiFi.h>
#endif

#define MYDEVICE_VERSION  "2.0.2"
#define MD_MAX_PROPS      16
#define MD_MAX_ACTIONS    8
#define MD_MAX_PARAMS     4
#define MD_BUF            1024

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * @brief Callback invoked when a property is updated from the platform.
 * @param val The new value encapsulated in an ArduinoJson JsonVariant.
 */
typedef void (*MDPropertyChangeHandler)(JsonVariant val);

/**
 * @brief Callback invoked when an action is executed from the platform.
 * @param params An ArduinoJson JsonObject containing action parameters.
 */
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

/**
 * @class MyDevice
 * @brief Main SDK Class for connecting devices to the MyDevice IoT platform.
 * 
 * Handles automated MQTT connections, blueprint schema definitions, telemetry caching,
 * and mapping incoming commands to corresponding C++ callbacks.
 */
class MyDevice {
public:
    /**
     * @brief Constructs a new MyDevice instance.
     * @param deviceId Your unique device ID (e.g. "DEV-001").
     * @param secretKey Your device's secret key.
     * @param net The underlying Client instance (e.g., WiFiClient or EthernetClient).
     * @param broker The MQTT broker address (default: "mydevice.in").
     * @param port The MQTT broker port (default: 1883).
     */
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

    /**
     * @brief Defines a generic property on the device (telemetry, state, or controllable feature).
     * @param name Unique identifier for the property (e.g., "fan_speed").
     * @param label Human-readable name for UI generation.
     * @param type Data type: "number", "boolean", or "string".
     * @param writable If true, the platform can send SET commands to change this property.
     * @param onChange Callback triggered when the platform updates this property.
     * @param unit Unit of measurement (e.g., "°C", "%").
     */
    void addProperty(const char* name, const char* label, const char* type, 
                     bool writable = false, MDPropertyChangeHandler onChange = nullptr, 
                     const char* unit = "") {
        if (_propCount >= MD_MAX_PROPS) return;
        auto& p = _props[_propCount++];
        
        strncpy(p.name, name, sizeof(p.name) - 1);
        p.name[sizeof(p.name) - 1] = '\0';
        
        strncpy(p.label, label, sizeof(p.label) - 1);
        p.label[sizeof(p.label) - 1] = '\0';
        
        strncpy(p.type, type, sizeof(p.type) - 1);
        p.type[sizeof(p.type) - 1] = '\0';
        
        strncpy(p.unit, unit, sizeof(p.unit) - 1);
        p.unit[sizeof(p.unit) - 1] = '\0';
        
        p.writable = writable;
        p.onChange = onChange;
        p.stateChanged = false;
        
        // Init state zero
        if (strcmp(p.type, "number") == 0) p.state.fv = 0.0;
        else if (strcmp(p.type, "boolean") == 0) p.state.bv = false;
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
        // Note: min/max limits are rendered on the UI side.
        addProperty(name, label, "number", true, onChange, "");
    }

    // ── Telemetry & Sync ────────────────────────────────────────────

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
                    strncpy(_props[i].state.sv, val, sizeof(_props[i].state.sv) - 1);
                    _props[i].state.sv[sizeof(_props[i].state.sv) - 1] = '\0';
                    _props[i].stateChanged = true;
                }
                return;
            }
        }
    }

    void send(const char* name, float val, bool forceSend = false) { updateProperty(name, val, forceSend); }
    void send(const char* name, bool val, bool forceSend = false)  { updateProperty(name, val, forceSend); }
    void send(const char* name, const char* val, bool forceSend = false) { updateProperty(name, val, forceSend); }

    // ── Actions ─────────────────────────────────────────────────────

    void addAction(const char* name, const char* label, const char* desc, MDActionHandler onExecute) {
        if (_actCount >= MD_MAX_ACTIONS) return;
        auto& a = _actions[_actCount++];
        
        strncpy(a.name, name, sizeof(a.name) - 1);
        a.name[sizeof(a.name) - 1] = '\0';
        
        strncpy(a.label, label, sizeof(a.label) - 1);
        a.label[sizeof(a.label) - 1] = '\0';
        
        strncpy(a.desc, desc, sizeof(a.desc) - 1);
        a.desc[sizeof(a.desc) - 1] = '\0';
        
        a.paramCount = 0;
        a.onExecute = onExecute;
    }

    void addActionParam(const char* paramName, const char* type) {
        if (_actCount == 0) return;
        auto& a = _actions[_actCount - 1];
        if (a.paramCount >= MD_MAX_PARAMS) return;
        auto& p = a.params[a.paramCount++];
        
        strncpy(p.name, paramName, sizeof(p.name) - 1);
        p.name[sizeof(p.name) - 1] = '\0';
        
        strncpy(p.type, type, sizeof(p.type) - 1);
        p.type[sizeof(p.type) - 1] = '\0';
        
        p.required = true;
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    void begin() {
        _mqtt.setServer(_broker, _port);
        _mqtt.setBufferSize(MD_BUF * 2);
        _mqtt.setCallback([this](char* t, byte* p, unsigned int l) { _onMsg(t, p, l); });
        // Connection deferred to loop() to keep setup() non-blocking
    }

    void loop() {
        if (!_mqtt.connected()) {
            _reconnect();
        } else {
            _mqtt.loop();
        }
        
        // Auto-sync state changes
        bool hasChanges = false;
        for (int i=0; i<_propCount; i++) {
            if (_props[i].stateChanged) { hasChanges = true; break; }
        }
        
        if (hasChanges && _mqtt.connected()) {
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
        JsonDocument doc;
        JsonArray arr = doc.to<JsonArray>();
        
        if (_propCount > 0) {
            JsonObject stateCap = arr.add<JsonObject>();
            stateCap["name"] = "device_state";
            stateCap["label"] = "Device State";
            stateCap["description"] = "Device properties and sensors";
            
            JsonArray actions = stateCap["actions"].to<JsonArray>();
            for (int i=0; i<_propCount; i++) {
                if (_props[i].writable) {
                    JsonObject act = actions.add<JsonObject>();
                    char actName[64];
                    snprintf(actName, sizeof(actName), "SET_%s", _props[i].name);
                    for(int j=0; actName[j]; j++) actName[j] = toupper(actName[j]);
                    
                    act["name"] = actName;
                    act["label"] = String("Set ") + _props[i].label;
                    JsonObject params = act["parameters"].to<JsonObject>();
                    JsonObject p = params[_props[i].name].to<JsonObject>();
                    p["type"] = _props[i].type;
                    p["required"] = true;
                }
            }
            if (actions.size() == 0) stateCap.remove("actions");
        }
        
        if (_actCount > 0) {
            JsonObject actionCap = arr.add<JsonObject>();
            actionCap["name"] = "system_actions";
            actionCap["label"] = "System Actions";
            actionCap["description"] = "Stateless device commands";
            
            JsonArray actions = actionCap["actions"].to<JsonArray>();
            for (int i=0; i<_actCount; i++) {
                JsonObject act = actions.add<JsonObject>();
                act["name"] = _actions[i].name;
                act["label"] = _actions[i].label;
                act["description"] = _actions[i].desc;
                
                JsonObject params = act["parameters"].to<JsonObject>();
                for (int j=0; j<_actions[i].paramCount; j++) {
                    JsonObject p = params[_actions[i].params[j].name].to<JsonObject>();
                    p["type"] = _actions[i].params[j].type;
                    p["required"] = _actions[i].params[j].required;
                }
            }
        }
        
        char buf[MD_BUF * 2];
        size_t n = serializeJson(doc, buf, sizeof(buf));
        if (n > 0) {
            _mqtt.publish(_tCaps, buf, true);
        }
    }

    void _sendTelemetry() {
        JsonDocument doc;
        doc["device_id"] = _did;
        doc["source"]    = "";
        JsonObject data  = doc["data"].to<JsonObject>();
        
        bool included[MD_MAX_PROPS] = {false};
        bool hasData = false;
        
        for (int i = 0; i < _propCount; i++) {
            if (_props[i].stateChanged) {
                if (strcmp(_props[i].type, "number") == 0) data[_props[i].name] = _props[i].state.fv;
                else if (strcmp(_props[i].type, "boolean") == 0) data[_props[i].name] = _props[i].state.bv;
                else data[_props[i].name] = _props[i].state.sv;
                included[i] = true;
                hasData = true;
            }
        }
        
        if (!hasData) return;
        
        char buf[MD_BUF];
        size_t n = serializeJson(doc, buf, sizeof(buf));
        
        if (n > 0 && _mqtt.publish(_tData, buf)) {
            // Only clear stateChanged if publish succeeded
            for (int i = 0; i < _propCount; i++) {
                if (included[i]) {
                    _props[i].stateChanged = false;
                }
            }
        }
    }

    void _reconnect() {
        if (_mqtt.connected()) return;
        
        unsigned long now = millis();
        // 10-second non-blocking backoff to prevent CPU hogging during MQTT/DNS timeouts
        if (_lastReconnectAttempt != 0 && (now - _lastReconnectAttempt < 10000)) return;
        _lastReconnectAttempt = (now == 0) ? 1 : now;

        // Skip blocking PubSubClient connect attempt if WiFi is explicitly down
#if defined(ESP8266) || defined(ESP32)
        if (WiFi.status() != WL_CONNECTED) {
            return; 
        }
#endif

        Serial.print("[MyDevice] Connecting...");
        
        // Prepare Last Will and Testament (LWT) payload so broker automatically marks offline on power loss
        char lwtMsg[128];
        snprintf(lwtMsg, sizeof(lwtMsg), "{\"device_id\":\"%s\",\"status\":\"offline\"}", _did);
        
        // connect(id, user, pass, willTopic, willQos, willRetain, willMessage)
        if (_mqtt.connect(_did, _did, _key, _tStatus, 0, false, lwtMsg)) {
            Serial.println(" OK");
            _mqtt.subscribe(_tCmd);
            
            JsonDocument doc;
            doc["device_id"] = _did;
            doc["status"]    = "online";
            char buf[128];
            serializeJson(doc, buf, sizeof(buf));
            _mqtt.publish(_tStatus, buf);
            
            _publishSchema();
            
            // Force sync all state on reconnect
            for(int i=0; i<_propCount; i++) _props[i].stateChanged = true;
            _sendTelemetry();
            _lastReconnectAttempt = 0; // Reset backoff on success
            
        } else {
            Serial.print(" FAIL (rc=");
            Serial.print(_mqtt.state());
            Serial.println(")");
        }
    }

    void _onMsg(char* topic, byte* payload, unsigned int len) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, payload, len);
        if (err) return;
        
        const char* cmdType = "UNKNOWN";
        if (doc.containsKey("command_type")) cmdType = doc["command_type"];
        else if (doc.containsKey("type")) cmdType = doc["type"];
        else if (doc.containsKey("command")) cmdType = doc["command"];

        const char* cmdId = "n/a";
        if (doc.containsKey("command_id")) cmdId = doc["command_id"];

        const char* corrId = "n/a";
        if (doc.containsKey("correlation_id")) corrId = doc["correlation_id"];
        
        JsonObject params = doc["parameters"].as<JsonObject>();
        if (params.isNull()) {
            params = doc["payload"].as<JsonObject>();
        }

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
            JsonDocument ack;
            ack["command_id"]      = cmdId;
            ack["correlation_id"]  = corrId;
            ack["status"]          = status;
            char buf[256];
            serializeJson(ack, buf, sizeof(buf));
            _mqtt.publish(_tCmdAck, buf);
        }
    }
};

#endif // MYDEVICE_H
