This document details the MQTT communication protocol used between the backend and IoT devices.

## Broker
- **Software:** Eclipse Mosquitto (Docker)
- **Port:** 1883
- **Configuration:** Authenticated access via `mosquitto.passwd` and `mosquitto.acl`.

## Connection
The Node.js backend connects to the MQTT broker using the `mqtt.js` library.
The broker URL is specified via `MQTT_BROKER_URL` in the `.env` file, alongside `MQTT_USERNAME` and `MQTT_PASSWORD` which represent the backend service's admin credentials.

## Prototype Security Limitations
- **MQTT Authentication is implemented:** Devices use their generated `Device ID` as the MQTT username, and `Secret Key` as the MQTT password.
- **TLS:** The local prototype does not yet use TLS. All data is currently transmitted in plaintext over port 1883.
- **ACLs:** Topic access is restricted. Devices can only read from their own command topics and publish to their own data/status topics.
- **Production Warning:** Production systems should use encrypted transport (TLS/SSL), stronger credential lifecycle management, and potentially certificate-based device authentication.

## Topics and Message Direction

### 1. Telemetry Data
- **Topic:** `devices/{device_id}/data`
- **Subscriber:** Backend
- **Purpose:** Transmit sensor readings to the server.
- **Sample Payload:**
  ```json
  {
    "device_id": "DEV-001",
    "data": {
      "temperature": 28.5,
      "humidity": 64
    }
  }
  ```
- **Direction:** Device -> Broker -> Backend

### Commands
- **Topic:** `devices/{device_id}/command`
- **Publisher:** Backend
- **Subscriber:** Device (via Connector)
- **Purpose:** Send control messages to the device (e.g., toggle LED).
- **Sample Payload:**
  ```json
  {
    "command": "LED_ON"
  }
  ```
- **Direction:** Backend -> Broker -> Device

### Status
- **Topic:** `devices/{device_id}/status`
- **Publisher:** Device (via Connector) / Broker (via LWT - Last Will and Testament)
- **Subscriber:** Backend
- **Purpose:** Report online/offline status.
- **Sample Payload:**
  ```json
  {
    "status": "online"
  }
  ```
- **Direction:** Device -> Broker -> Backend
