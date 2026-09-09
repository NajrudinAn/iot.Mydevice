This document details the MQTT communication protocol used between the backend and IoT devices.

## Broker
- **Software:** Eclipse Mosquitto (Native Ubuntu Install 1.6.9)
- **Port:** 1883
- **Configuration:** Authenticated access via `mosquitto.passwd` and `mosquitto.acl`.

## Connection
The Node.js backend connects to the MQTT broker using the `mqtt.js` library.
The broker URL is specified via `MQTT_BROKER_URL` in the `.env` file, alongside `MQTT_USERNAME` (default `mydevice_backend`) and `MQTT_PASSWORD` which represent the backend service's admin credentials.

## Production Provisioning Architecture
Mosquitto is treated as an external infrastructure dependency. The Node.js application (`mydevice-api`) **never** rewrites the Mosquitto password database or ACL file at startup. 

### Device Provisioning via Privileged Helper
To ensure strict security and prevent file corruption, the Node.js API relies on a **Privileged Provisioning Helper Script**.
- **Location**: `/usr/local/bin/mqtt_provision_helper.sh`
- **Ownership**: `root:root`
- **Permissions**: The Node.js PM2 user is granted passwordless `sudo` specifically for this script via `/etc/sudoers.d/mydevice_mqtt`.
- **Workflow**:
  1. The API validates the action and streams the generated device secret securely to the script via `stdin`.
  2. The helper validates the device ID via regex.
  3. The helper executes `mosquitto_passwd -b` to safely add the device authentication.
  4. The helper appends the device-specific ACL block to `mosquitto.acl` (Idempotently skipping if it already exists).
  5. The helper reloads the Mosquitto broker via `systemctl`.
- **Limitation & Safety**: Because Mosquitto 1.6.9 lacks dynamic ACL APIs, full ACL rewriting is dangerous. When a device is deleted, the helper removes its password but leaves its historical ACL block intact. This makes the stale rules inert and perfectly safe, entirely bypassing the need for destructive `sed` file manipulation.

## Prototype Security Limitations
- **TLS:** The local prototype does not yet use TLS. All data is currently transmitted in plaintext over port 1883.
- **Production Warning:** Production systems should use encrypted transport (TLS/SSL).

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
