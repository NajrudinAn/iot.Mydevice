import paho.mqtt.client as mqtt
import json
import time
import requests
import uuid

BASE_URL = "http://localhost:3000/api"
BROKER = "localhost"

email = f"mqtt_{uuid.uuid4()}@test.com"
requests.post(f"{BASE_URL}/auth/register", json={"name": "MQTT User", "email": email, "password": "password123"})
token = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "password123"}).json()['token']
headers = {"Authorization": f"Bearer {token}"}
ws_id = requests.get(f"{BASE_URL}/workspaces", headers=headers).json()['workspaces'][0]['id']

dev = requests.post(f"{BASE_URL}/workspaces/{ws_id}/devices", json={"name": "MQTT Dev", "device_type": "ESP32"}, headers=headers).json()['device']
device_id = dev['device_id']
secret = dev['secret_key']

app_id = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={"name": "MQTT App"}, headers=headers).json()['application']['id']
requests.post(f"{BASE_URL}/applications/{app_id}/devices", json={"device_id": device_id}, headers=headers)

client = mqtt.Client(client_id=f"sim_{device_id}")
client.username_pw_set(device_id, secret)

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.publish(f"devices/{device_id}/data", json.dumps({"temperature": 25.5, "humidity": 60}), qos=1)

client.on_connect = on_connect
client.connect(BROKER, 1883, 60)
client.loop_start()
time.sleep(2)
client.loop_stop()

# Check db
import psycopg2
conn = psycopg2.connect("dbname=iot_platform user=postgres password=postgres host=localhost")
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM sensor_data WHERE device_id = %s", (device_id,))
count = cur.fetchone()[0]

print(f"6B-16, 6B-17 | MQTT/Telemetry Regression | PASS if count>0 | Count: {count}")
