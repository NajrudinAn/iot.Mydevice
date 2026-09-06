#ifndef MYDEVICE_SITE_H
#define MYDEVICE_SITE_H

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Preferences.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include "MyDeviceCommand.h"

// Configuration struct for the internal AP and behavior
struct MyDeviceConfig {
    bool enableWebConfig = true;
    bool enableAPMode = true;
    const char* defaultDeviceName = "MyDevice";
    const char* defaultConfigPassword = "admin";
};

class MyDeviceSite {
public:
    MyDeviceSite();
    ~MyDeviceSite();

    MyDeviceConfig config;

    // Configuration
    void setServer(const char* server, uint16_t port);
    
    // Initialization
    // If credentials are provided here, they act as defaults. If the device was previously
    // configured via the Web AP, those stored credentials take precedence.
    void begin(const char* defaultSsid = "", const char* defaultPass = "", const char* defaultDeviceId = "", const char* defaultSecretKey = "");
    
    // Must be called repeatedly in the main Arduino loop
    void loop();

    // --- Telemetry Publishing ---
    void publishTelemetry(const char* key, int value);
    void publishTelemetry(const char* key, float value);
    void publishTelemetry(const char* key, bool value);
    void publishTelemetry(const char* key, const char* value);
    void publishTelemetryJson(const char* jsonString);

    // --- Command Handling ---
    typedef void (*CommandHandler)(const MyDeviceCommand& cmd);
    void onCommand(const char* actionName, CommandHandler handler);

    // --- Capability Registration ---
    void addCapability(const char* capName, const char* type = "control");
    void addAction(const char* capName, const char* actionName, const char* label, const char* description = "");
    void addBooleanParam(const char* actionName, const char* paramName);
    void addNumberParam(const char* actionName, const char* paramName, float min, float max, float step = 1.0f);
    void addTextParam(const char* actionName, const char* paramName);
    // Values should be comma separated, e.g. "LOW,MEDIUM,HIGH"
    void addEnumParam(const char* actionName, const char* paramName, const char* commaSeparatedValues);

    void publishCapabilities();

    // --- Backward Compatibility for IoTConnector ---
    void publishData(float temperature, float humidity);

    // --- Status ---
    bool isWifiConnected() const;
    bool isMqttConnected() const;
    void factoryReset();

private:
    WiFiClient _espClient;
    PubSubClient _mqttClient;
    Preferences _preferences;
    WebServer* _server;
    
    // Credentials
    String _ssid;
    String _pass;
    String _deviceId;
    String _secretKey;
    String _deviceName;
    String _configPass;
    
    // Broker config
    String _mqttServer;
    uint16_t _mqttPort;
    
    // Topics
    String _topicData;
    String _topicCommand;
    String _topicStatus;
    String _topicCapabilities;
    
    // State
    unsigned long _lastReconnectAttempt;
    bool _apModeActive;
    
    // Capabilities Document (ArduinoJson 7 dynamic memory)
    JsonDocument _capabilitiesDoc;

    // Command Handlers (Max 20 for memory safety)
    static const int MAX_HANDLERS = 20;
    struct HandlerEntry {
        String actionName;
        CommandHandler handler;
    };
    HandlerEntry _handlers[MAX_HANDLERS];
    int _handlerCount;

    // Internal methods
    void loadPreferences(const char* defaultSsid, const char* defaultPass, const char* defaultDeviceId, const char* defaultSecretKey);
    void setupWiFi();
    void startAP();
    void startWebServer();
    void handleWebClient();
    
    void reconnectMQTT();
    static void mqttCallbackProxy(char* topic, byte* payload, unsigned int length);
    void handleMqttMessage(char* topic, byte* payload, unsigned int length);
    
    void publishStatus(const char* status);
    JsonVariant getActionVariant(const char* actionName);

    // Web endpoints
    void handleRoot();
    void handleConfig();
    void handleSave();
    void handleReset();
    bool authenticateRequest();
    
    static MyDeviceSite* _instance;
};

#endif
