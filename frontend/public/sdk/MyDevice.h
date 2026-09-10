/*
 * MyDevice Arduino SDK v1.0 — Single-Header Library
 * ==================================================
 * Requires: PubSubClient, ArduinoJson
 *
 * Installation:
 *   Option A: Place MyDevice.h in ~/Arduino/libraries/MyDevice/
 *   Option B: Place MyDevice.h in the same folder as your .ino sketch
 *   Then: #include "MyDevice.h"
 *
 * Usage:
 *   #include <WiFi.h>
 *   #include "MyDevice.h"
 *
 *   WiFiClient   wifiClient;
 *   MyDevice     device("DEV-001-ABCD", "your_secret_key", wifiClient);
 *
 *   void setup() {
 *       WiFi.begin("SSID", "PASS");
 *       while (WiFi.status() != WL_CONNECTED) delay(500);
 *       device.begin();
 *       device.onCommand("SET_FAN_SPEED", [](JsonObject p) { ... return true; });
 *   }
 *
 *   void loop() {
 *       device.loop();
 *       device.addField("temperature", 25.4);
 *       device.send("sensor_1");
 *   }
 */

#ifndef MYDEVICE_H
#define MYDEVICE_H

#include <Arduino.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define MYDEVICE_VERSION  "1.0.0"
#define MD_MAX_FIELDS     16
#define MD_MAX_CAPS       8
#define MD_MAX_ACTIONS    16
#define MD_MAX_PARAMS     4
#define MD_MAX_HANDLERS   16
#define MD_BUF            1024

// ─── Types ──────────────────────────────────────────────────────────────────

typedef bool (*MDCommandHandler)(JsonObject params);

struct _MDField {
    char key[32];
    enum { FLT, INT, BOL, STR } type;
    float fv; int iv; bool bv; char sv[48];
};

struct _MDParam {
    char name[24]; char type[12];
    float mn, mx, step;
    bool required;
};

struct _MDAction {
    char capName[32];
    char name[48]; char label[48]; char desc[96];
    _MDParam params[MD_MAX_PARAMS];
    int paramCount;
};

struct _MDCap {
    char name[32]; char label[48]; char desc[96]; char statePath[48];
};

struct _MDHan {
    char type[48];
    MDCommandHandler fn;
};

// ─── MyDevice Class ─────────────────────────────────────────────────────────

class MyDevice {
public:
    MyDevice(const char* deviceId, const char* secretKey, Client& net,
             const char* broker = "mydevice.in", int port = 1883)
        : _did(deviceId), _key(secretKey), _broker(broker), _port(port),
          _fieldCount(0), _capCount(0), _actCount(0), _hanCount(0), _mqtt(net)
    {
        snprintf(_tData,   sizeof(_tData),   "devices/%s/data",         deviceId);
        snprintf(_tStatus, sizeof(_tStatus), "devices/%s/status",       deviceId);
        snprintf(_tCmd,    sizeof(_tCmd),    "devices/%s/command",      deviceId);
        snprintf(_tCmdAck, sizeof(_tCmdAck), "devices/%s/command/ack",  deviceId);
        snprintf(_tCaps,   sizeof(_tCaps),   "devices/%s/capabilities", deviceId);
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    /** Call in setup() after WiFi is connected. */
    void begin() {
        _mqtt.setServer(_broker, _port);
        _mqtt.setBufferSize(MD_BUF);
        _mqtt.setCallback([this](char* t, byte* p, unsigned int l) { _onMsg(t, p, l); });
        _reconnect();
    }

    /** Call every loop() iteration. */
    void loop() {
        if (!_mqtt.connected()) _reconnect();
        _mqtt.loop();
    }

    bool isConnected() { return _mqtt.connected(); }

    // ── Telemetry ───────────────────────────────────────────────────

    /** Add a float field to the next send() batch. */
    void addField(const char* key, float val) {
        if (_fieldCount >= MD_MAX_FIELDS) return;
        auto& f = _fields[_fieldCount++];
        strncpy(f.key, key, 31); f.type = _MDField::FLT; f.fv = val;
    }

    /** Add an int field. */
    void addField(const char* key, int val) {
        if (_fieldCount >= MD_MAX_FIELDS) return;
        auto& f = _fields[_fieldCount++];
        strncpy(f.key, key, 31); f.type = _MDField::INT; f.iv = val;
    }

    /** Add a bool field. */
    void addField(const char* key, bool val) {
        if (_fieldCount >= MD_MAX_FIELDS) return;
        auto& f = _fields[_fieldCount++];
        strncpy(f.key, key, 31); f.type = _MDField::BOL; f.bv = val;
    }

    /** Add a string field. */
    void addField(const char* key, const char* val) {
        if (_fieldCount >= MD_MAX_FIELDS) return;
        auto& f = _fields[_fieldCount++];
        strncpy(f.key, key, 31); f.type = _MDField::STR; strncpy(f.sv, val, 47);
    }

    /**
     * Publish all queued fields as telemetry and clear the buffer.
     * @param source  Logical group name, e.g. "sensor_1"
     * @returns true if publish succeeded
     */
    bool send(const char* source = "sensor_1") {
        if (_fieldCount == 0) return false;
        StaticJsonDocument<MD_BUF> doc;
        doc["device_id"] = _did;
        doc["source"]    = source;
        JsonObject data  = doc.createNestedObject("data");
        for (int i = 0; i < _fieldCount; i++) {
            auto& f = _fields[i];
            switch (f.type) {
                case _MDField::FLT: data[f.key] = f.fv; break;
                case _MDField::INT: data[f.key] = f.iv; break;
                case _MDField::BOL: data[f.key] = f.bv; break;
                case _MDField::STR: data[f.key] = f.sv; break;
            }
        }
        char buf[MD_BUF];
        serializeJson(doc, buf, MD_BUF);
        _fieldCount = 0;
        return _mqtt.publish(_tData, buf);
    }

    // ── Capabilities ────────────────────────────────────────────────

    /**
     * Register a capability group. Call before begin().
     * @param name        Snake_case ID, e.g. "motor_control"
     * @param label       Human label
     * @param description Short description
     * @param statePath   Telemetry key path for state display
     */
    void addCapability(const char* name, const char* label,
                       const char* description = "", const char* statePath = "") {
        if (_capCount >= MD_MAX_CAPS) return;
        auto& c = _caps[_capCount++];
        strncpy(c.name, name, 31);
        strncpy(c.label, label, 47);
        strncpy(c.desc, description, 95);
        strncpy(c.statePath, statePath, 47);
    }

    /**
     * Add an action under an existing capability.
     * @param capName    Must match a name from addCapability()
     * @param actionName Command type string, e.g. "SET_FAN_SPEED"
     * @param label      Human label
     * @param desc       Short description
     */
    void addAction(const char* capName, const char* actionName,
                   const char* label, const char* desc = "") {
        if (_actCount >= MD_MAX_ACTIONS) return;
        auto& a = _actions[_actCount++];
        strncpy(a.capName, capName, 31);
        strncpy(a.name, actionName, 47);
        strncpy(a.label, label, 47);
        strncpy(a.desc, desc, 95);
        a.paramCount = 0;
    }

    /** Add a number parameter to the most recently added action. */
    void addNumberParam(const char* name, float mn, float mx, float step = 1) {
        if (_actCount == 0) return;
        auto& a = _actions[_actCount - 1];
        if (a.paramCount >= MD_MAX_PARAMS) return;
        auto& p = a.params[a.paramCount++];
        strncpy(p.name, name, 23); strncpy(p.type, "number", 11);
        p.mn = mn; p.mx = mx; p.step = step; p.required = true;
    }

    /** Add a boolean parameter to the most recently added action. */
    void addBoolParam(const char* name) {
        if (_actCount == 0) return;
        auto& a = _actions[_actCount - 1];
        if (a.paramCount >= MD_MAX_PARAMS) return;
        auto& p = a.params[a.paramCount++];
        strncpy(p.name, name, 23); strncpy(p.type, "boolean", 11);
        p.mn = 0; p.mx = 0; p.step = 0; p.required = true;
    }

    /** Publish all registered capabilities (called automatically on connect). */
    void publishCapabilities() {
        if (_capCount == 0) return;
        DynamicJsonDocument doc(MD_BUF * 2);
        JsonArray arr = doc.to<JsonArray>();
        for (int c = 0; c < _capCount; c++) {
            JsonObject cap = arr.createNestedObject();
            cap["name"] = _caps[c].name;
            cap["label"] = _caps[c].label;
            cap["description"] = _caps[c].desc;
            if (strlen(_caps[c].statePath) > 0) {
                JsonObject sm = cap.createNestedObject("state_mapping");
                sm["path"] = _caps[c].statePath;
                sm["unit"] = "metrics";
            }
            // Add matching actions
            JsonArray acts = cap.createNestedArray("actions");
            for (int a = 0; a < _actCount; a++) {
                if (strcmp(_actions[a].capName, _caps[c].name) != 0) continue;
                JsonObject act = acts.createNestedObject();
                act["name"] = _actions[a].name;
                act["label"] = _actions[a].label;
                act["description"] = _actions[a].desc;
                JsonObject params = act.createNestedObject("parameters");
                for (int p = 0; p < _actions[a].paramCount; p++) {
                    auto& pr = _actions[a].params[p];
                    JsonObject pm = params.createNestedObject(pr.name);
                    pm["type"] = pr.type;
                    if (strcmp(pr.type, "number") == 0) {
                        pm["min"] = pr.mn; pm["max"] = pr.mx; pm["step"] = pr.step;
                    }
                    pm["required"] = pr.required;
                }
            }
            if (acts.size() == 0) cap.remove("actions");
        }
        char buf[MD_BUF * 2];
        serializeJson(doc, buf, sizeof(buf));
        _mqtt.publish(_tCaps, buf, true);
    }

    // ── Commands ────────────────────────────────────────────────────

    /**
     * Register a handler for a command type.
     * Handler receives a JsonObject of parameters, returns true=COMPLETED, false=FAILED.
     *
     * Example:
     *   device.onCommand("SET_FAN_SPEED", [](JsonObject p) {
     *       int speed = p["speed"];
     *       analogWrite(FAN_PIN, speed * 85);
     *       return true;
     *   });
     */
    void onCommand(const char* commandType, MDCommandHandler handler) {
        if (_hanCount >= MD_MAX_HANDLERS) return;
        strncpy(_handlers[_hanCount].type, commandType, 47);
        _handlers[_hanCount].fn = handler;
        _hanCount++;
    }

    // ── Status ──────────────────────────────────────────────────────

    /** Publish device status. */
    void publishStatus(const char* status) {
        StaticJsonDocument<128> doc;
        doc["device_id"] = _did;
        doc["status"]    = status;
        char buf[128];
        serializeJson(doc, buf);
        _mqtt.publish(_tStatus, buf);
    }

private:
    const char*  _did;
    const char*  _key;
    const char*  _broker;
    int          _port;
    PubSubClient _mqtt;

    char _tData[80], _tStatus[80], _tCmd[80], _tCmdAck[80], _tCaps[80];

    _MDField   _fields[MD_MAX_FIELDS];   int _fieldCount;
    _MDCap     _caps[MD_MAX_CAPS];       int _capCount;
    _MDAction  _actions[MD_MAX_ACTIONS]; int _actCount;
    _MDHan     _handlers[MD_MAX_HANDLERS]; int _hanCount;

    void _reconnect() {
        while (!_mqtt.connected()) {
            Serial.print("[MyDevice] Connecting...");
            if (_mqtt.connect(_did, _did, _key)) {
                Serial.println(" OK");
                _mqtt.subscribe(_tCmd);
                publishStatus("online");
                publishCapabilities();
            } else {
                Serial.printf(" FAIL (rc=%d)\n", _mqtt.state());
                delay(3000);
            }
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
        for (int i = 0; i < _hanCount; i++) {
            if (strcmp(_handlers[i].type, cmdType) == 0) {
                status = _handlers[i].fn(params) ? "COMPLETED" : "FAILED";
                break;
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
