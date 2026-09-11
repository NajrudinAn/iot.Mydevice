import paho.mqtt.client as mqtt
import time
import json
import random
import math
import sys

# ─────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────
BROKER       = "mydevice.in"
PORT         = 1883

DEVICE_ID   = "DEV-001-FE59"
SECRET_KEY  = "d95794d45b79bcd9390ac95784094c48bd8ad1fc3db5631708c336316f5367d7"

TOPIC_DATA         = f"devices/{DEVICE_ID}/data"
TOPIC_STATUS       = f"devices/{DEVICE_ID}/status"
TOPIC_COMMAND      = f"devices/{DEVICE_ID}/command"
TOPIC_COMMAND_ACK  = f"devices/{DEVICE_ID}/command/ack"
TOPIC_CAPABILITIES = f"devices/{DEVICE_ID}/capabilities"

TELEMETRY_INTERVAL_S = 5
_tick = 0

# ─────────────────────────────────────────────
#  Data Groups
#
#  Each group is sent as a SEPARATE MQTT message:
#    { device_id, source: "sensor_1", data: { temperature: 22.5, ... } }
#
#  The backend prefixes field names with source:
#    → sensor_1.temperature, sensor_1.humidity, …
#
#  This keeps each source fully independent — any
#  device can publish just its own group without
#  knowing about other groups.
# ─────────────────────────────────────────────

# Group 1 — Environmental sensors
SENSOR_1 = {
    "temperature": 22.5,   # °C   – sinusoidal drift
    "humidity":    48.0,   # %    – random walk
    "pressure":    1012.0, # hPa  – slow sinusoidal
    "air_quality": 95,     # AQI  – random walk  (lower = better)
}

# Group 2 — Motion & ambient sensors
SENSOR_2 = {
    "light_level":  320,   # Lux  – sinusoidal
    "motion":       False, # bool – random flip
    "door_open":    False, # bool – rare random flip
    "noise_level":  34,    # dB   – random walk
}

# Group 3 — Motor / actuator status (writable via commands)
MOTOR = {
    "fan_speed":    0,     # 0-3  – controlled via SET_FAN_SPEED
    "pump_active":  False, # bool – controlled via SET_PUMP
    "valve_angle":  0,     # 0-180 deg – controlled via SET_VALVE
    "power_w":      0.0,   # W    – derived from other actuator states
}

def ts():
    return time.strftime('%H:%M:%S')

def log(action, message, data=None):
    print(f"\n[{ts()}] [{action}] {message}")
    if data:
        print(f"    {json.dumps(data, default=str)}")

# ─────────────────────────────────────────────
#  MQTT Callbacks
# ─────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        log("CONNECTED", f"Authenticated as {DEVICE_ID}")
        client.subscribe(TOPIC_COMMAND)
        log("SUBSCRIBED", TOPIC_COMMAND)
        publish_status(client, "ONLINE")
        publish_capabilities(client)
    else:
        log("ERROR", f"Connection refused - rc={rc}")

def on_disconnect(client, userdata, rc):
    log("DISCONNECTED", f"rc={rc}")

def on_message(client, userdata, msg):
    try:
        envelope  = json.loads(msg.payload.decode("utf-8"))
        command   = envelope.get("command_type", envelope.get("type", envelope.get("command", "UNKNOWN")))
        params    = envelope.get("parameters", envelope.get("payload", {}))
        cmd_id    = envelope.get("command_id", "n/a")
        corr_id   = envelope.get("correlation_id", "n/a")

        log("CMD IN", f"'{command}' [id={cmd_id}]", params)

        changed = False; ack_status = "COMPLETED"; result = {}; error_msg = None

        if command == "SET_FAN_SPEED":
            speed = params.get("speed")
            try: speed = int(speed)
            except: pass
            if speed in (0, 1, 2, 3):
                MOTOR["fan_speed"] = speed
                labels = {0:"OFF",1:"LOW",2:"MEDIUM",3:"HIGH"}
                log("ACTION", f"Fan -> {labels[speed]}")
                result = {"actual_speed": speed}; changed = True
            else:
                ack_status = "FAILED"; error_msg = f"Invalid speed: {speed!r} (0-3)"

        elif command == "SET_PUMP":
            active = params.get("active")
            if isinstance(active, str): active = active.lower() in ["true","1","on","yes"]
            if isinstance(active, bool):
                MOTOR["pump_active"] = active
                log("ACTION", f"Pump -> {'ON' if active else 'OFF'}")
                result = {"pump_active": active}; changed = True
            else:
                ack_status = "FAILED"; error_msg = f"Invalid value: {active!r}"

        elif command == "SET_VALVE":
            angle = params.get("angle")
            try: angle = int(angle)
            except: angle = None
            if angle is not None and 0 <= angle <= 180:
                MOTOR["valve_angle"] = angle
                log("ACTION", f"Valve -> {angle}°")
                result = {"valve_angle": angle}; changed = True
            else:
                ack_status = "FAILED"; error_msg = f"Invalid angle: {angle!r} (0-180)"

        else:
            log("UNKNOWN", f"'{command}'")
            ack_status = "REJECTED"; error_msg = f"Unknown command: {command}"

        # ACK
        if cmd_id != "n/a":
            ack = {"command_id": cmd_id, "correlation_id": corr_id, "status": ack_status}
            if result:    ack["result"] = result
            if error_msg: ack["error_message"] = error_msg
            client.publish(TOPIC_COMMAND_ACK, json.dumps(ack))
            log("ACK OUT", f"{ack_status} for {cmd_id}")

        if changed:
            publish_all(client, manual=True)

    except Exception as exc:
        log("ERROR", f"Message processing failed: {exc}")

# ─────────────────────────────────────────────
#  Publishers
# ─────────────────────────────────────────────
def publish_status(client, status):
    payload = {"device_id": DEVICE_ID, "status": status.upper()}
    client.publish(TOPIC_STATUS, json.dumps(payload))
    log("STATUS OUT", status.upper())

def publish_capabilities(client):
    payload = [
        {
            "name": "motor_control",
            "label": "Motor Control",
            "description": "Control the fan, pump, and valve actuators",
            "actions": [
                {
                    "name": "SET_FAN_SPEED",
                    "label": "Set Fan Speed",
                    "description": "Set the fan speed (0=off, 1=low, 2=medium, 3=high)",
                    "parameters": {
                        "speed": {"type": "number", "min": 0, "max": 3, "step": 1, "required": True}
                    }
                },
                {
                    "name": "SET_PUMP",
                    "label": "Toggle Water Pump",
                    "description": "Activate or deactivate the water pump",
                    "parameters": {
                        "active": {"type": "boolean", "required": True}
                    }
                },
                {
                    "name": "SET_VALVE",
                    "label": "Set Valve Angle",
                    "description": "Control the valve opening (0=closed, 180=fully open)",
                    "parameters": {
                        "angle": {"type": "number", "min": 0, "max": 180, "step": 10, "required": True}
                    }
                }
            ],
            "state_mapping": {"path": "motor_status.fan_speed", "unit": "level"}
        },
        {
            "name": "environmental_sensors",
            "label": "Environmental Sensors",
            "description": "Provides temperature, humidity, pressure, and air quality data",
            "state_mapping": {"path": "sensor_1", "unit": "metrics"}
        },
        {
            "name": "motion_ambient_sensors",
            "label": "Motion & Ambient Sensors",
            "description": "Provides light level, motion detection, door status, and noise level",
            "state_mapping": {"path": "sensor_2", "unit": "metrics"}
        }
    ]
    client.publish(TOPIC_CAPABILITIES, json.dumps(payload), retain=True)
    log("CAPS OUT", "Motor Control group registered")

def publish_group(client, source, data):
    """
    Publish a single group as:
      { "device_id": ..., "source": "sensor_1", "data": { "temperature": 22.5, ... } }

    The backend will store fields as sensor_1.temperature, sensor_1.humidity etc.
    Each group can be published independently at different rates if needed.
    """
    payload = {
        "device_id": DEVICE_ID,
        "source": source,
        "data": data
    }
    client.publish(TOPIC_DATA, json.dumps(payload))
    log("DATA OUT", f"source={source}  ({len(data)} fields)", data)

def update_sensor1():
    """Simulate environmental sensor drift."""
    SENSOR_1["temperature"] = round(22.0 + 4.0 * math.sin(_tick * 0.12) + random.uniform(-0.1, 0.1), 2)
    SENSOR_1["humidity"]    = round(max(35.0, min(80.0, SENSOR_1["humidity"] + random.uniform(-0.4, 0.4))), 1)
    SENSOR_1["pressure"]    = round(1013.0 + 3.0 * math.sin(_tick * 0.05) + random.uniform(-0.2, 0.2), 1)
    SENSOR_1["air_quality"] = max(5, min(150, int(SENSOR_1["air_quality"] + random.randint(-3, 3))))

def update_sensor2():
    """Simulate motion and ambient sensor readings."""
    SENSOR_2["light_level"] = max(0, min(1000, int(300 + 200 * math.sin(_tick * 0.08) + random.randint(-10, 10))))
    if random.random() < 0.08: SENSOR_2["motion"]    = not SENSOR_2["motion"]
    if random.random() < 0.03: SENSOR_2["door_open"] = not SENSOR_2["door_open"]
    SENSOR_2["noise_level"] = max(20, min(90, int(SENSOR_2["noise_level"] + random.randint(-5, 5))))

def update_motor():
    """Derive power draw from actuator states."""
    fan, pump, valve = MOTOR["fan_speed"], MOTOR["pump_active"], MOTOR["valve_angle"]
    MOTOR["power_w"] = round(fan * 12.5 + (pump * 45.0) + (valve / 180.0 * 8.0) + random.uniform(-0.5, 0.5), 2)

def publish_all(client, manual=False):
    global _tick
    _tick += 1

    update_sensor1()
    update_sensor2()
    update_motor()

    prefix = "MANUAL" if manual else "TELEMETRY"
    print(f"\n[{ts()}] [{prefix}] --- publishing 3 groups ---")

    # Each group is a separate MQTT message with its own source label
    publish_group(client, "sensor_1",     dict(SENSOR_1))
    publish_group(client, "sensor_2",     dict(SENSOR_2))
    publish_group(client, "motor_status", dict(MOTOR))

# ─────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  SMART HOME MULTI-GROUP SIMULATOR  -  DEV-002-F123")
    print("=" * 60)
    print("  Sends 3 separate MQTT messages per tick:")
    print("  source=sensor_1     : temperature, humidity, pressure, air_quality")
    print("  source=sensor_2     : light_level, motion, door_open, noise_level")
    print("  source=motor_status : fan_speed, pump_active, valve_angle, power_w")
    print(f"  Broker: {BROKER}:{PORT}  |  Every {TELEMETRY_INTERVAL_S}s")
    print("=" * 60)

    client = mqtt.Client(client_id=DEVICE_ID, callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
    client.username_pw_set(username=DEVICE_ID, password=SECRET_KEY)
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message
    client.will_set(TOPIC_STATUS, json.dumps({"device_id": DEVICE_ID, "status": "OFFLINE"}), retain=False)

    try:
        log("SYSTEM", f"Connecting to {BROKER}:{PORT}...")
        client.connect(BROKER, PORT, keepalive=60)
    except Exception as exc:
        log("ERROR", f"Cannot reach broker: {exc}")
        sys.exit(1)

    client.loop_start()
    try:
        while True:
            time.sleep(TELEMETRY_INTERVAL_S)
            if client.is_connected():
                publish_all(client)
    except KeyboardInterrupt:
        log("SYSTEM", "Shutting down...")
        publish_status(client, "OFFLINE")
        time.sleep(0.5)
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
