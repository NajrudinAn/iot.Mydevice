#include "MyDeviceSite.h"

MyDeviceSite* MyDeviceSite::_instance = nullptr;

MyDeviceSite::MyDeviceSite() 
    : _server(nullptr), _mqttServer("localhost"), _mqttPort(1883), 
      _lastReconnectAttempt(0), _apModeActive(false), _handlerCount(0) {
    _instance = this;
    _mqttClient.setClient(_espClient);
    _mqttClient.setBufferSize(1024); // Support large capabilities JSON up to 1KB
    
    // Ensure capabilities document starts as an array
    _capabilitiesDoc.to<JsonArray>();
}

MyDeviceSite::~MyDeviceSite() {
    if (_server) {
        delete _server;
    }
}

void MyDeviceSite::setServer(const char* server, uint16_t port) {
    _mqttServer = server;
    _mqttPort = port;
    _mqttClient.setServer(_mqttServer.c_str(), _mqttPort);
}

void MyDeviceSite::loadPreferences(const char* defaultSsid, const char* defaultPass, const char* defaultDeviceId, const char* defaultSecretKey) {
    _preferences.begin("iot_config", false);
    
    _ssid = _preferences.getString("ssid", defaultSsid);
    _pass = _preferences.getString("pass", defaultPass);
    _deviceId = _preferences.getString("deviceId", defaultDeviceId);
    _secretKey = _preferences.getString("secretKey", defaultSecretKey);
    _deviceName = _preferences.getString("deviceName", config.defaultDeviceName);
    _configPass = _preferences.getString("configPass", config.defaultConfigPassword);
}

void MyDeviceSite::begin(const char* defaultSsid, const char* defaultPass, const char* defaultDeviceId, const char* defaultSecretKey) {
    loadPreferences(defaultSsid, defaultPass, defaultDeviceId, defaultSecretKey);
    
    if (_deviceId.length() > 0) {
        _topicData = "devices/" + _deviceId + "/data";
        _topicCommand = "devices/" + _deviceId + "/command";
        _topicStatus = "devices/" + _deviceId + "/status";
        _topicCapabilities = "devices/" + _deviceId + "/capabilities";
    }
    
    _mqttClient.setCallback(MyDeviceSite::mqttCallbackProxy);
    
    setupWiFi();
    
    if (config.enableWebConfig) {
        startWebServer();
    }
}

void MyDeviceSite::setupWiFi() {
    if (_ssid.length() == 0) {
        Serial.println("[MyDevice] No WiFi credentials found.");
        if (config.enableAPMode) startAP();
        return;
    }

    Serial.print("[MyDevice] Connecting WiFi to ");
    Serial.println(_ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid.c_str(), _pass.c_str());
    
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
        delay(500);
        Serial.print(".");
        retries++;
    }
    Serial.println();
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[MyDevice] WiFi connected!");
        Serial.print("[MyDevice] IP Address: ");
        Serial.println(WiFi.localIP());
        _apModeActive = false;
    } else {
        Serial.println("[MyDevice] WiFi connection failed.");
        if (config.enableAPMode) {
            startAP();
        }
    }
}

void MyDeviceSite::startAP() {
    Serial.println("[MyDevice] Starting Access Point mode...");
    _apModeActive = true;
    
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    String apSsid = _deviceName + "-" + mac.substring(8);
    
    WiFi.mode(WIFI_AP);
    WiFi.softAP(apSsid.c_str(), "setup123"); 
    
    Serial.print("[MyDevice] AP SSID: ");
    Serial.println(apSsid);
    Serial.print("[MyDevice] AP IP: ");
    Serial.println(WiFi.softAPIP());
}

void MyDeviceSite::reconnectMQTT() {
    if (_deviceId.length() == 0 || _secretKey.length() == 0) {
        return;
    }
    
    // Set LWT *before* connecting
    String willPayload = String("{\"device_id\":\"") + _deviceId + "\",\"status\":\"OFFLINE\"}";
    
    // Attempt to connect (clientId, username, password, willTopic, willQoS, willRetain, willMessage)
    if (_mqttClient.connect(_deviceId.c_str(), _deviceId.c_str(), _secretKey.c_str(), _topicStatus.c_str(), 1, false, willPayload.c_str())) {
        Serial.println("[MyDevice] MQTT connected.");
        
        // Announce ONLINE Status
        publishStatus("ONLINE");
        
        // Publish Capabilities if any exist
        publishCapabilities();
        
        // Subscribe to Commands exactly once upon connection
        _mqttClient.subscribe(_topicCommand.c_str());
        Serial.println("[MyDevice] Subscribed to command topic.");
    } else {
        Serial.print("[MyDevice] MQTT failed, rc=");
        Serial.println(_mqttClient.state());
    }
}

void MyDeviceSite::loop() {
    if (_server) {
        _server->handleClient();
    }
    
    if (_apModeActive) return;
    
    if (WiFi.status() != WL_CONNECTED) return;
    
    if (!_mqttClient.connected()) {
        long now = millis();
        // 5-second backoff
        if (now - _lastReconnectAttempt > 5000) {
            _lastReconnectAttempt = now;
            Serial.println("[MyDevice] Connecting MQTT...");
            reconnectMQTT();
        }
    } else {
        _mqttClient.loop();
    }
}

bool MyDeviceSite::isWifiConnected() const {
    return WiFi.status() == WL_CONNECTED;
}

bool MyDeviceSite::isMqttConnected() const {
    return _mqttClient.connected();
}

void MyDeviceSite::publishStatus(const char* status) {
    if (isMqttConnected()) {
        String payload = String("{\"device_id\":\"") + _deviceId + "\",\"status\":\"") + status + "\"}";
        _mqttClient.publish(_topicStatus.c_str(), payload.c_str(), false);
    }
}

void MyDeviceSite::publishTelemetryJson(const char* jsonString) {
    if (isMqttConnected()) {
        String payload = String("{\"device_id\":\"") + _deviceId + "\",\"data\":") + jsonString + "}";
        _mqttClient.publish(_topicData.c_str(), payload.c_str());
    }
}

void MyDeviceSite::publishTelemetry(const char* key, int value) {
    String json = String("{\"") + key + "\":" + value + "}";
    publishTelemetryJson(json.c_str());
}

void MyDeviceSite::publishTelemetry(const char* key, float value) {
    String json = String("{\"") + key + "\":" + value + "}";
    publishTelemetryJson(json.c_str());
}

void MyDeviceSite::publishTelemetry(const char* key, bool value) {
    String json = String("{\"") + key + "\":" + (value ? "true" : "false") + "}";
    publishTelemetryJson(json.c_str());
}

void MyDeviceSite::publishTelemetry(const char* key, const char* value) {
    String json = String("{\"") + key + "\":\"") + value + "\"}";
    publishTelemetryJson(json.c_str());
}

void MyDeviceSite::publishData(float temperature, float humidity) {
    String json = String("{\"temperature\":") + temperature + ",\"humidity\":" + humidity + "}";
    publishTelemetryJson(json.c_str());
}

void MyDeviceSite::onCommand(const char* actionName, CommandHandler handler) {
    if (!actionName || !handler) return;
    
    // Check for existing handler and overwrite if found
    for (int i = 0; i < _handlerCount; i++) {
        if (_handlers[i].actionName == actionName) {
            _handlers[i].handler = handler;
            return;
        }
    }
    
    if (_handlerCount < MAX_HANDLERS) {
        _handlers[_handlerCount].actionName = actionName;
        _handlers[_handlerCount].handler = handler;
        _handlerCount++;
    } else {
        Serial.println("[MyDevice] ERROR: Max command handlers (20) reached.");
    }
}

void MyDeviceSite::mqttCallbackProxy(char* topic, byte* payload, unsigned int length) {
    if (_instance) {
        _instance->handleMqttMessage(topic, payload, length);
    }
}

void MyDeviceSite::handleMqttMessage(char* topic, byte* payload, unsigned int length) {
    if (String(topic) == _topicCommand) {
        // Safe deserialization bounded to length
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, payload, length);
        
        if (err) {
            Serial.print("[MyDevice] Command JSON Parse Error: ");
            Serial.println(err.c_str());
            return;
        }
        
        const char* type = doc["type"] | doc["command"] | "";
        if (strlen(type) == 0) {
            Serial.println("[MyDevice] Received command without 'type'. Ignoring.");
            return;
        }

        JsonVariantConst cmdPayload = doc["payload"];
        
        bool handled = false;
        for (int i = 0; i < _handlerCount; i++) {
            if (_handlers[i].actionName == type) {
                MyDeviceCommand cmdObj(type, cmdPayload);
                _handlers[i].handler(cmdObj);
                handled = true;
                break; // One handler per action
            }
        }
        
        if (!handled) {
            Serial.print("[MyDevice] Unknown command received: ");
            Serial.println(type);
        }
    }
}

void MyDeviceSite::addCapability(const char* capName, const char* type) {
    if (!capName || strlen(capName) == 0) return;
    JsonArray root = _capabilitiesDoc.as<JsonArray>();
    
    // Check if capability already exists
    for (JsonObject cap : root) {
        if (cap["name"] == capName) {
            return;
        }
    }
    
    // Add new capability
    JsonObject newCap = root.createNestedObject();
    newCap["name"] = capName;
    newCap["type"] = type;
    newCap["actions"].to<JsonArray>();
}

void MyDeviceSite::addAction(const char* capName, const char* actionName, const char* label, const char* description) {
    if (!capName || strlen(capName) == 0 || !actionName || strlen(actionName) == 0) return;
    JsonArray root = _capabilitiesDoc.as<JsonArray>();
    for (JsonObject cap : root) {
        if (cap["name"] == capName) {
            // Check for duplicate actions
            JsonArray actions = cap["actions"].as<JsonArray>();
            for (JsonObject a : actions) {
                if (a["name"] == actionName) return; // Duplicate
            }
            
            JsonObject action = actions.createNestedObject();
            action["name"] = actionName;
            action["label"] = label;
            if (strlen(description) > 0) {
                action["description"] = description;
            }
            action["parameters"].to<JsonObject>();
            return;
        }
    }
    Serial.print("[MyDevice] WARN: addAction called for unknown capability: ");
    Serial.println(capName);
}

JsonVariant MyDeviceSite::getActionVariant(const char* actionName) {
    JsonArray root = _capabilitiesDoc.as<JsonArray>();
    for (JsonObject cap : root) {
        JsonArray actions = cap["actions"].as<JsonArray>();
        for (JsonObject action : actions) {
            if (action["name"] == actionName) {
                return action["parameters"];
            }
        }
    }
    return JsonVariant();
}

void MyDeviceSite::addBooleanParam(const char* actionName, const char* paramName) {
    if (!paramName || strlen(paramName) == 0) return;
    JsonVariant params = getActionVariant(actionName);
    if (!params.isNull()) {
        JsonObject p = params.as<JsonObject>()[paramName].to<JsonObject>();
        p["type"] = "boolean";
    }
}

void MyDeviceSite::addNumberParam(const char* actionName, const char* paramName, float min, float max, float step) {
    if (!paramName || strlen(paramName) == 0 || min >= max || step <= 0) return;
    JsonVariant params = getActionVariant(actionName);
    if (!params.isNull()) {
        JsonObject p = params.as<JsonObject>()[paramName].to<JsonObject>();
        p["type"] = "number";
        p["min"] = min;
        p["max"] = max;
        p["step"] = step;
    }
}

void MyDeviceSite::addTextParam(const char* actionName, const char* paramName) {
    if (!paramName || strlen(paramName) == 0) return;
    JsonVariant params = getActionVariant(actionName);
    if (!params.isNull()) {
        JsonObject p = params.as<JsonObject>()[paramName].to<JsonObject>();
        p["type"] = "text";
    }
}

void MyDeviceSite::addEnumParam(const char* actionName, const char* paramName, const char* commaSeparatedValues) {
    if (!paramName || strlen(paramName) == 0 || !commaSeparatedValues || strlen(commaSeparatedValues) == 0) return;
    JsonVariant params = getActionVariant(actionName);
    if (!params.isNull()) {
        JsonObject p = params.as<JsonObject>()[paramName].to<JsonObject>();
        p["type"] = "enum";
        JsonArray enumArray = p["enum"].to<JsonArray>();
        
        String values = String(commaSeparatedValues);
        int startIndex = 0;
        int commaIndex = values.indexOf(',');
        while (commaIndex != -1) {
            enumArray.add(values.substring(startIndex, commaIndex));
            startIndex = commaIndex + 1;
            commaIndex = values.indexOf(',', startIndex);
        }
        enumArray.add(values.substring(startIndex)); // Add last item
    }
}

void MyDeviceSite::publishCapabilities() {
    if (!isMqttConnected()) return;
    JsonArray root = _capabilitiesDoc.as<JsonArray>();
    if (root.size() == 0) return;
    
    String payload;
    serializeJson(_capabilitiesDoc, payload);
    
    _mqttClient.publish(_topicCapabilities.c_str(), payload.c_str(), true); // retain=true
    Serial.println("[MyDevice] Capabilities published.");
}

// ---------------------------------------------------------
// Web Server Implementation (Preserved AP Configuration)
// ---------------------------------------------------------
bool MyDeviceSite::authenticateRequest() {
    if (!_server->authenticate("admin", _configPass.c_str())) {
        _server->requestAuthentication();
        return false;
    }
    return true;
}

void MyDeviceSite::startWebServer() {
    _server = new WebServer(80);
    
    _server->on("/", [this]() {
        if (!authenticateRequest()) return;
        this->handleRoot();
    });
    
    _server->on("/config", [this]() {
        if (!authenticateRequest()) return;
        this->handleConfig();
    });
    
    _server->on("/save", HTTP_POST, [this]() {
        if (!authenticateRequest()) return;
        this->handleSave();
    });

    _server->on("/reset", [this]() {
        if (!authenticateRequest()) return;
        this->handleReset();
    });

    _server->begin();
    Serial.println("[MyDevice] HTTP config server started.");
}

void MyDeviceSite::handleRoot() {
    String html = "<html><head><title>Device Status</title><style>";
    html += "body{font-family:Arial,sans-serif;margin:40px auto;max-width:400px;line-height:1.6;color:#333;}";
    html += "h2{color:#0056b3;} .card{padding:20px;border:1px solid #ddd;border-radius:8px;}";
    html += "a.btn{display:inline-block;padding:10px 15px;background:#0056b3;color:white;text-decoration:none;border-radius:4px;margin-right:10px;}";
    html += "</style></head><body>";
    
    html += "<h2>" + _deviceName + "</h2>";
    html += "<div class='card'>";
    html += "<p><strong>WiFi:</strong> " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected") + "</p>";
    if (WiFi.status() == WL_CONNECTED) {
        html += "<p><strong>IP Address:</strong> " + WiFi.localIP().toString() + "</p>";
    }
    html += "<p><strong>MQTT:</strong> " + String(_mqttClient.connected() ? "Connected" : "Disconnected") + "</p>";
    html += "<p><strong>Device ID:</strong> " + _deviceId + "</p>";
    html += "</div><br/>";
    
    html += "<a href='/config' class='btn'>Configuration</a>";
    html += "</body></html>";
    _server->send(200, "text/html", html);
}

void MyDeviceSite::handleConfig() {
    String html = "<html><head><title>Device Configuration</title><style>";
    html += "body{font-family:Arial,sans-serif;margin:20px auto;max-width:400px;}";
    html += "input{width:100%;padding:8px;margin:8px 0;box-sizing:border-box;}";
    html += "button{padding:10px 15px;background:#0056b3;color:white;border:none;border-radius:4px;cursor:pointer;}";
    html += "button.danger{background:#dc3545;}";
    html += "</style></head><body>";
    
    html += "<h2>Configuration</h2>";
    html += "<form action='/save' method='POST'>";
    html += "<label>Device Name:</label>";
    html += "<input type='text' name='deviceName' value='" + _deviceName + "'><br/>";
    html += "<label>Wi-Fi SSID:</label>";
    html += "<input type='text' name='ssid' value='" + _ssid + "'><br/>";
    html += "<label>Wi-Fi Password (leave blank to keep current):</label>";
    html += "<input type='password' name='pass'><br/>";
    html += "<label>Device ID:</label>";
    html += "<input type='text' name='deviceId' value='" + _deviceId + "'><br/>";
    html += "<label>Secret Key (leave blank to keep current):</label>";
    html += "<input type='password' name='secretKey'><br/>";
    html += "<hr/><h3>Security</h3>";
    html += "<label>New Configuration Password (leave blank to keep current):</label>";
    html += "<input type='password' name='configPass'><br/>";
    html += "<br/><button type='submit'>Save Configuration & Restart</button>";
    html += "</form>";
    html += "<hr/><form action='/reset' method='POST'><button class='danger' type='submit'>Factory Reset</button></form>";
    html += "<a href='/'>Back to Status</a>";
    html += "</body></html>";
    _server->send(200, "text/html", html);
}

void MyDeviceSite::handleSave() {
    if (_server->hasArg("deviceName")) _deviceName = _server->arg("deviceName");
    if (_server->hasArg("ssid")) _ssid = _server->arg("ssid");
    if (_server->hasArg("pass") && _server->arg("pass").length() > 0) _pass = _server->arg("pass");
    if (_server->hasArg("deviceId")) _deviceId = _server->arg("deviceId");
    if (_server->hasArg("secretKey") && _server->arg("secretKey").length() > 0) _secretKey = _server->arg("secretKey");
    if (_server->hasArg("configPass") && _server->arg("configPass").length() > 0) _configPass = _server->arg("configPass");
    
    _preferences.putString("deviceName", _deviceName);
    _preferences.putString("ssid", _ssid);
    _preferences.putString("pass", _pass);
    _preferences.putString("deviceId", _deviceId);
    _preferences.putString("secretKey", _secretKey);
    _preferences.putString("configPass", _configPass);
    
    _server->send(200, "text/plain", "Saved. Restarting...");
    delay(1000);
    ESP.restart();
}

void MyDeviceSite::handleReset() {
    _preferences.clear();
    _server->send(200, "text/plain", "Factory Reset Complete. Restarting...");
    delay(1000);
    ESP.restart();
}

void MyDeviceSite::factoryReset() {
    _preferences.clear();
    ESP.restart();
}
