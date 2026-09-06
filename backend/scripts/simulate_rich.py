import paho.mqtt.client as mqtt
import json
import time
import random
import math
import sys

BROKER_HOST = "localhost"
BROKER_PORT = 1883

DEVICES = {
    "DEV-006-91E0": "WEATHER_STATION",
    "DEV-007-A5D4": "INDUSTRIAL_MACHINE",
    "DEV-008-7191": "SMART_VEHICLE"
}

# Base Capabilities
CAPABILITIES_SCHEMA = [
    {
        "name": "power",
        "label": "Power Control",
        "type": "action_group",
        "actions": [
            {
                "name": "POWER_ON",
                "label": "Turn On",
                "description": "Powers up the device",
                "target_state": "ON"
            },
            {
                "name": "POWER_OFF",
                "label": "Turn Off",
                "description": "Powers down the device",
                "target_state": "OFF"
            }
        ],
        "state": {
            "path": "power",
            "type": "enum",
            "values": ["OFF", "ON"]
        }
    },
    {
        "name": "motor_speed",
        "label": "Motor Speed",
        "type": "control",
        "actions": [
            {
                "name": "SET_SPEED",
                "label": "Set Speed",
                "parameters": {
                    "speed": {
                        "type": "number",
                        "required": True,
                        "min": 0,
                        "max": 5000,
                        "unit": "RPM"
                    }
                }
            }
        ],
        "state": {
            "path": "motor.speed",
            "type": "number",
            "unit": "RPM"
        }
    }
]

CAPABILITIES_V2 = [
    CAPABILITIES_SCHEMA[0],
    {
        "name": "motor_speed",
        "label": "Motor Speed",
        "type": "control",
        "actions": [
            {
                "name": "SET_SPEED",
                "label": "Set Speed",
                "parameters": {
                    "speed": {
                        "type": "number",
                        "required": True,
                        "min": 0,
                        "max": 5000,
                        "unit": "RPM"
                    }
                }
            },
            {
                "name": "STOP_MOTOR",
                "label": "Stop Motor",
                "target_state": "OFF"
            }
        ],
        "state": {
            "path": "motor.speed",
            "type": "number",
            "unit": "RPM"
        }
    }
]

# State initialization
states = {
    "DEV-006-91E0": { "power": "ON", "temp": 25.0, "hum": 40.0, "co2": 400.0, "uv": 2.0 },
    "DEV-007-A5D4": { "power": "ON", "spindle_rpm": 0, "target_rpm": 0, "temp": 45.0, "vibration": 0.5, "pressure": 110.0 },
    "DEV-008-7191": { "power": "ON", "lat": 40.7128, "long": -74.0060, "speed": 45.0, "target_speed": 45.0, "fuel": 85.0 }
}

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")
    for device_id in DEVICES:
        client.subscribe(f"devices/{device_id}/command")
        # Publish capabilities immediately on connect
        print(f"[{device_id}] Publishing capabilities schema...")
        client.publish(f"devices/{device_id}/capabilities", json.dumps(CAPABILITIES_SCHEMA), retain=True)

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        
        parts = topic.split('/')
        if len(parts) >= 3 and parts[2] == 'command':
            device_id = parts[1]
            command_id = payload.get('command_id')
            correlation_id = payload.get('correlation_id')
            cmd_type = payload.get('type')
            cmd_payload = payload.get('payload', {})
            
            print(f"\n[COMMAND] Received {cmd_type} for {device_id}")
            print(f"[COMMAND] command_id={command_id}")
            if cmd_payload:
                for k, v in cmd_payload.items():
                    print(f"[COMMAND] {k}={v}")
            print(f"[COMMAND] Executing {cmd_type}")
            
            # Simulate execution delay
            time.sleep(random.uniform(0.1, 0.3))
            
            # Action specific logic
            ack_status = "COMPLETED"
            
            if cmd_type == "POWER_ON":
                states[device_id]["power"] = "ON"
                if device_id == "DEV-007-A5D4":
                    states[device_id]["spindle_rpm"] = states[device_id].get("target_rpm", 0)
                if device_id == "DEV-008-7191":
                    states[device_id]["speed"] = states[device_id].get("target_speed", 0)
            elif cmd_type == "POWER_OFF":
                states[device_id]["power"] = "OFF"
                if device_id == "DEV-007-A5D4":
                    states[device_id]["spindle_rpm"] = 0
                if device_id == "DEV-008-7191":
                    states[device_id]["speed"] = 0
            elif cmd_type == "SET_SPEED":
                if states[device_id]["power"] == "OFF":
                    ack_status = "FAILED"
                else:
                    speed = cmd_payload.get('speed', 0)
                    if device_id == "DEV-007-A5D4":
                        states[device_id]["spindle_rpm"] = speed
                        states[device_id]["target_rpm"] = speed
                    elif device_id == "DEV-008-7191":
                        states[device_id]["speed"] = speed / 30.0 if speed > 0 else 0
                        states[device_id]["target_speed"] = states[device_id]["speed"]
            elif cmd_type == "STOP_MOTOR":
                if device_id == "DEV-007-A5D4":
                    states[device_id]["spindle_rpm"] = 0
                elif device_id == "DEV-008-7191":
                    states[device_id]["speed"] = 0
            else:
                ack_status = "REJECTED"
            
            motor_spd = states[device_id].get("spindle_rpm", 0) if device_id == "DEV-007-A5D4" else int(states[device_id].get("speed", 0) * 30)
            print(f"[STATE] power={states[device_id]['power']} motor.speed={motor_spd}")
            
            ack = {
                "command_id": command_id,
                "correlation_id": correlation_id,
                "status": ack_status,
            }
            if ack_status == "FAILED":
                ack["error_code"] = "DEVICE_OFF"
                ack["error_message"] = "Cannot set speed while power is OFF"
                
            client.publish(f"devices/{device_id}/command/ack", json.dumps(ack))
            print(f"[ACK] {cmd_type} {ack_status}")
            
            # Immediately publish state telemetry so the UI updates
            publish_telemetry(client, device_id)
            print(f"[DATA] Published state update")
            
    except Exception as e:
        print(f"Error handling message: {e}")

def publish_telemetry(client, device_id):
    if device_id == "DEV-006-91E0":
        payload = {
            "device_id": device_id,
            "data": {
                "power": states[device_id]["power"],
                "environment": {
                    "temperature_c": round(states[device_id]["temp"], 1),
                    "humidity_percent": round(states[device_id]["hum"], 1),
                }
            }
        }
    elif device_id == "DEV-007-A5D4":
        payload = {
            "device_id": device_id,
            "data": {
                "power": states[device_id]["power"],
                "motor": {
                    "speed": states[device_id]["spindle_rpm"],
                    "spindle_temp_c": round(states[device_id]["temp"], 1),
                    "vibration_mm_s": round(states[device_id]["vibration"], 2),
                }
            }
        }
    elif device_id == "DEV-008-7191":
        payload = {
            "device_id": device_id,
            "data": {
                "power": states[device_id]["power"],
                "gps": {
                    "speed_kmh": round(states[device_id]["speed"], 1),
                },
                "motor": {
                    "speed": int(states[device_id]["speed"] * 30) if states[device_id]["speed"] > 0 else 0
                }
            }
        }
    client.publish(f"devices/{device_id}/data", json.dumps(payload))

client = mqtt.Client(client_id="SIM-ALL-DEVICES-LIVE")
client.username_pw_set("backend_admin", "super_secret_backend")
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER_HOST, BROKER_PORT, 60)
client.loop_start()

print("Starting continuous rich simulation for all devices...")
try:
    for i in range(1200): # Run for long time
        
        # Simulate local physical button press on Industrial Machine (every 10 iterations)
        if i > 0 and i % 15 == 0:
            d2 = "DEV-007-A5D4"
            old_pow = states[d2]["power"]
            states[d2]["power"] = "OFF" if old_pow == "ON" else "ON"
            print(f"\n[LOCAL] Physical state change on {d2}")
            print(f"[STATE] power={states[d2]['power']}")
            if states[d2]["power"] == "OFF":
                states[d2]["spindle_rpm"] = 0
            publish_telemetry(client, d2)
            print("[DATA] Published state update")
            
        # Simulate capability changes on DEV-007-A5D4 (Industrial Machine)
        if i == 5:
            print(f"\n[CAPABILITIES] Changing capabilities for DEV-007-A5D4 (Adding STOP_MOTOR)...")
            client.publish(f"devices/DEV-007-A5D4/capabilities", json.dumps(CAPABILITIES_V2), retain=True)
            
        if i == 15:
            # We don't revert the capabilities here so the UI can keep showing STOP_MOTOR.
            pass
        
        # --- DEVICE 1: WEATHER STATION ---
        d1 = "DEV-006-91E0"
        states[d1]["temp"] += random.uniform(-0.2, 0.2)
        states[d1]["hum"] += random.uniform(-0.5, 0.5)
        states[d1]["co2"] += random.uniform(-2, 2)
        
        publish_telemetry(client, d1)
        if i % 12 == 0: client.publish(f"devices/{d1}/status", json.dumps({"device_id": d1, "status": "ONLINE"}))

        # --- DEVICE 2: INDUSTRIAL MACHINE ---
        d2 = "DEV-007-A5D4"
        if states[d2]["power"] == "ON":
            states[d2]["temp"] += random.uniform(0, 0.5)
            states[d2]["vibration"] = abs(math.sin(i / 5.0)) * 2 + random.uniform(0, 0.5)
        else:
            states[d2]["temp"] = max(20.0, states[d2]["temp"] - 0.5)
            states[d2]["vibration"] = 0
            
        publish_telemetry(client, d2)
        if i % 12 == 0: client.publish(f"devices/{d2}/status", json.dumps({"device_id": d2, "status": "ONLINE"}))
        
        # --- DEVICE 3: SMART VEHICLE ---
        d3 = "DEV-008-7191"
        if states[d3]["power"] == "ON":
            states[d3]["speed"] = max(0, min(120, states[d3]["speed"] + random.uniform(-5, 5)))
        else:
            states[d3]["speed"] = 0
            
        publish_telemetry(client, d3)
        if i % 12 == 0: client.publish(f"devices/{d3}/status", json.dumps({"device_id": d3, "status": "ONLINE"}))

        print(f"[{i}] Sent telemetry updates.")
        time.sleep(3)
except KeyboardInterrupt:
    print("\n[SHUTDOWN] Interrupted by user. Gracefully marking devices offline...")
    for d in ["DEV-006-91E0", "DEV-007-A5D4", "DEV-008-7191"]:
        client.publish(f"devices/{d}/status", json.dumps({"device_id": d, "status": "OFFLINE"}))
    client.loop_stop()
    client.disconnect()
    print("Goodbye!")
    sys.exit(0)
    print("Disconnected.")
