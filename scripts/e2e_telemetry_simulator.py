import paho.mqtt.client as mqtt
import json
import time

DEVICE_ID = "DEV-004-CC57"
SECRET_KEY = "b58e37649ab5fc3a305d859fb85925ae03fc55cdeffc99ae40e5a9e437a601e2"
BROKER = "localhost"
PORT = 1883

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to Mosquitto as {DEVICE_ID}!")
    else:
        print(f"Failed to connect, return code {rc}")

client = mqtt.Client(client_id=f"sim_{DEVICE_ID}")
client.username_pw_set(DEVICE_ID, SECRET_KEY)
client.on_connect = on_connect

client.connect(BROKER, PORT, 60)
client.loop_start()

print("Waiting for connection...")
time.sleep(1)

# Publish status
status_payload = {"device_id": DEVICE_ID, "status": "online"}
client.publish(f"devices/{DEVICE_ID}/status", json.dumps(status_payload))
print(f"Published status: {status_payload}")

# Publish multi-field telemetry
telemetry_payload = {
    "device_id": DEVICE_ID,
    "data": {
        "temperature": 29.5,
        "humidity": 65,
        "voltage": 3.32,
        "mode": "auto",
        "relay_active": True,
        "signal_strength": -65
    }
}
print(f"Publishing telemetry: {telemetry_payload}")
client.publish(f"devices/{DEVICE_ID}/data", json.dumps(telemetry_payload))

time.sleep(2)
client.loop_stop()
print("Done publishing.")
