import paho.mqtt.client as mqtt
import time
import json
import random
import sys

# ─────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────
BROKER       = "localhost"
PORT         = 1883
DEVICE_ID    = "DEV-001-F47C"
SECRET_KEY   = "bba6d3e4ec0d5d8c5c5a9b51ae3d9efec0fa5ce13cd79220689d1df7310b1fee"

# Topics (matching what the platform actually expects)
TOPIC_DATA     = f"devices/{DEVICE_ID}/data"
TOPIC_STATUS   = f"devices/{DEVICE_ID}/status"
TOPIC_COMMAND  = f"devices/{DEVICE_ID}/command"    # no "s", no wildcard
TOPIC_CAPABILITIES = f"devices/{DEVICE_ID}/capabilities"

TELEMETRY_INTERVAL_S = 5

# ─────────────────────────────────────────────
#  Device State
# ─────────────────────────────────────────────
state = {
    "temperature": 22.5,
    "humidity":    45.0,
    "light_status": False,
    "fan_speed":   0          # 0=off, 1=low, 2=medium, 3=high
}

def ts():
    return time.strftime('%H:%M:%S')

def log(action, message, data=None):
    print(f"\n[{ts()}] [{action}] {message}")
    if data:
        print(f"    Payload → {json.dumps(data)}")

# ─────────────────────────────────────────────
#  MQTT Callbacks
# ─────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        log("CONNECTED", f"Authenticated as {DEVICE_ID}")
        # Announce ONLINE status
        client.subscribe(TOPIC_COMMAND)
        log("SUBSCRIBED", TOPIC_COMMAND)
        publish_status(client, "ONLINE")
        publish_capabilities(client)
    else:
        log("ERROR", f"Connection refused – rc={rc}")

def on_disconnect(client, userdata, rc):
    log("DISCONNECTED", f"rc={rc}  (auto-reconnect active)")

def on_message(client, userdata, msg):
    try:
        envelope = json.loads(msg.payload.decode("utf-8"))
        # Platform sends: { command_id, correlation_id, type, payload, timestamp }
        command = envelope.get("type", envelope.get("command", "UNKNOWN"))
        data    = envelope.get("payload", {})
        cmd_id  = envelope.get("command_id", "n/a")

        log("COMMAND ↓", f"Received '{command}'  [cmd_id={cmd_id}]", data)

        changed = False

        if command == "SET_LIGHT":
            status = data.get("status")
            # Handle string boolean values
            if isinstance(status, str):
                status = status.lower() in ["true", "1", "on", "yes", "enable"]

            if isinstance(status, bool):
                state["light_status"] = status
                log("ACTION", f"Light → {'ON' if status else 'OFF'}")
                changed = True
            else:
                log("ERROR", f"Invalid light status value: {status!r}")

        elif command == "SET_FAN_SPEED":
            speed = data.get("speed")
            # Handle string integer values
            try:
                speed = int(speed)
            except (ValueError, TypeError):
                pass

            if speed in (0, 1, 2, 3):
                state["fan_speed"] = speed
                labels = {0: "OFF", 1: "LOW", 2: "MEDIUM", 3: "HIGH"}
                log("ACTION", f"Fan speed → {labels[speed]}")
                changed = True
            else:
                log("ERROR", f"Invalid fan speed: {speed!r}  (must be 0-3)")

        else:
            log("UNKNOWN", f"Unrecognised command '{command}'")

        if changed:
            publish_data(client, manual=True)

    except Exception as exc:
        log("ERROR", f"Failed to process message: {exc}")

# ─────────────────────────────────────────────
#  Publishers
# ─────────────────────────────────────────────
def publish_status(client, status: str):
    payload = {
        "device_id": DEVICE_ID,
        "status":    status.upper()
    }
    client.publish(TOPIC_STATUS, json.dumps(payload))
    log("STATUS ↑", f"Announced {status.upper()}")

def publish_capabilities(client):
    payload = [
        {
            "name": "Light Control",
            "type": "control",
            "actions": [
                {
                    "name": "SET_LIGHT",
                    "label": "Toggle Light",
                    "description": "Turn the smart light on or off",
                    "parameters": {
                        "status": { "type": "boolean" }
                    }
                }
            ]
        },
        {
            "name": "Fan Control",
            "type": "control",
            "actions": [
                {
                    "name": "SET_FAN_SPEED",
                    "label": "Set Fan Speed",
                    "description": "Set the fan speed (0=off, 1=low, 2=med, 3=high)",
                    "parameters": {
                        "speed": { "type": "number", "min": 0, "max": 3 }
                    }
                }
            ]
        }
    ]
    client.publish(TOPIC_CAPABILITIES, json.dumps(payload), retain=True)
    log("CAPABILITIES ↑", f"Announced capabilities", payload)

def publish_data(client, manual=False):
    # Simulate slight environmental drift
    state["temperature"] = round(state["temperature"] + random.uniform(-0.15, 0.15), 2)
    state["humidity"]    = round(max(30.0, min(75.0, state["humidity"] + random.uniform(-0.5, 0.5))), 1)

    payload = {
        "device_id": DEVICE_ID,
        "data": {
            "temperature":  state["temperature"],
            "humidity":     state["humidity"],
            "light_status": state["light_status"],
            "fan_speed":    state["fan_speed"]
        }
    }

    tag = "MANUAL ↑" if manual else "TELEMETRY ↑"
    log(tag, f"→ {TOPIC_DATA}", payload["data"])
    client.publish(TOPIC_DATA, json.dumps(payload))

# ─────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────
def main():
    print("=" * 52)
    print("   🏠  SMART HOME SIMULATOR  –  DEV-001-7024     ")
    print("=" * 52)

    client = mqtt.Client(
        client_id = DEVICE_ID,
        callback_api_version = mqtt.CallbackAPIVersion.VERSION1
    )
    client.username_pw_set(username=DEVICE_ID, password=SECRET_KEY)
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message

    # OFFLINE will-message – platform marks device offline if we crash
    will_payload = json.dumps({"device_id": DEVICE_ID, "status": "OFFLINE"})
    client.will_set(TOPIC_STATUS, will_payload, retain=False)

    try:
        log("SYSTEM", f"Connecting to {BROKER}:{PORT}…")
        client.connect(BROKER, PORT, keepalive=60)
    except Exception as exc:
        log("ERROR", f"Cannot reach broker: {exc}")
        sys.exit(1)

    client.loop_start()

    try:
        while True:
            time.sleep(TELEMETRY_INTERVAL_S)
            if client.is_connected():
                publish_data(client)
    except KeyboardInterrupt:
        log("SYSTEM", "Shutting down…")
        publish_status(client, "OFFLINE")
        time.sleep(0.5)
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
