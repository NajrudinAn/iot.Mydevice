# Device Integration & Capabilities Guide

This document serves as the comprehensive library and reference guide for how devices connect, report data, declare their capabilities dynamically, and receive commands within the IoT platform. 

*Note: This document reflects the system state up to the completion of real-time offline detection and dynamic command syncing. It will be updated further once the API Integration phase is complete.*

---

## 1. MQTT Connection & Data Sharing

Devices communicate with the platform exclusively over MQTT (or via HTTP APIs that map to the MQTT broker). The platform listens to specific topics to maintain a real-time shadow of the device state.

### Core Topics
- **`devices/{device_id}/status`**
  - **Payload:** `{"device_id": "...", "status": "ONLINE" | "OFFLINE"}`
  - **Purpose:** Tracks whether the device is actively connected.
  - **Graceful Shutdown:** Devices should implement Last Will and Testament (LWT) or publish `"status": "OFFLINE"` via a shutdown hook right before disconnecting to enable instant real-time UI updates. If they fail to do so, the server will aggressively mark them offline after 15 seconds of inactivity.
- **`devices/{device_id}/data`**
  - **Payload:** Raw JSON telemetry (e.g. `{"temp": 25.0, "power": "ON", "motor": {"speed": 1650}}`)
  - **Purpose:** Streams live sensor data and state changes.

---

## 2. Dynamic Capabilities (The Device Library)

Rather than hardcoding UI components or command validators, the platform is **100% dynamic**. Devices declare exactly what they are capable of by publishing their "Capabilities Schema" to the platform.

### Registration Topic
- **`devices/{device_id}/capabilities`**
  - **Payload:** A JSON array of capability definitions.
  - **Purpose:** When a device publishes to this topic, the platform instantly wipes its old capabilities and registers the new ones. The Frontend UI will automatically re-render buttons, sliders, and charts based on this payload without needing a page refresh.

### Example Capability Payload
```json
[
  {
    "name": "motor_speed",
    "label": "Motor Speed",
    "type": "control",
    "actions": [
      {
        "name": "SET_SPEED",
        "label": "Set Speed",
        "parameters": {
          "speed": { "type": "number", "required": true, "min": 0, "max": 5000, "unit": "RPM" }
        }
      },
      {
        "name": "STOP_MOTOR",
        "label": "Stop Motor",
        "target_state": "OFF"
      }
    ],
    "state_mapping": {
      "path": "motor.speed",
      "type": "number",
      "unit": "RPM"
    }
  }
]
```

### State Mapping & Real-Time Syncing
Notice the `state_mapping` object above. It tells the frontend exactly where to look in the raw telemetry JSON (`"path": "motor.speed"`) to find the *actual state* of this capability. 
- When the UI loads, the `SET_SPEED` slider will automatically initialize to the exact current speed of the motor. 
- If the device's Power capability is turned `OFF`, the frontend will automatically mask this capability and display **"Turned Off"**.

---

## 3. Command Execution

The platform securely translates frontend user interactions (button clicks, slider adjustments) into real-time MQTT commands sent to the physical devices.

### Command Flow
1. **Frontend Request:** The UI sends an HTTP POST to `/api/workspaces/.../devices/.../commands` with `{"type": "STOP_MOTOR", "payload": {}}`.
2. **Dynamic Validation:** The backend queries the database. If `STOP_MOTOR` is currently registered in the device's capabilities, it is allowed. If the device has removed this capability, it is rejected with `INVALID_COMMAND`.
3. **MQTT Dispatch:** The backend publishes the command to `devices/{device_id}/command`.
4. **Device Execution:** The physical device (or simulation script) receives the command, executes the action, updates its local hardware state, and replies.
5. **ACK & State Update:** The device publishes an ACK to `devices/{device_id}/command/ack` with `"status": "COMPLETED"`, and subsequently publishes its new telemetry to `devices/{device_id}/data` so the UI instantly reflects the new physical state.

---

## 4. Simulation Script (`simulate_rich.py`)

For testing purposes, the `simulate_rich.py` script acts as a virtual hardware cluster.
- It dynamically injects capabilities (like `STOP_MOTOR`) to prove the UI updates in real-time.
- It maintains internal memory (e.g. `target_rpm`) so that if a device is powered off and back on, it gracefully ramps back to its previously configured speed instead of resetting to 0.
- It intercepts `Ctrl+C` commands to fire an instant graceful shutdown sequence, keeping the frontend perfectly synchronized.

---

## 5. Next Phase: API Implementation

*(To be updated in the next phase)*

The next milestone focuses on full API integrations, exposing these dynamic capabilities and real-time telemetry streams securely to external consumers (like mobile apps or third-party enterprise services) via the App Users and API Keys system.
