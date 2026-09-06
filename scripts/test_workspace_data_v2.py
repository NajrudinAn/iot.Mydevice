import paho.mqtt.client as mqtt
import json
import time
import random
import os
import requests
import uuid

# Configuration
BROKER = "localhost"
PORT = 1883
HTTP_PORT = 3000

print("--- DEVSYNC WORKSPACE DATA V2 E2E VERIFICATION ---")

# 1. Register and login a dynamic user
try:
    email = f"e2e_v2_{uuid.uuid4().hex[:8]}@test.com"
    requests.post(f"http://localhost:{HTTP_PORT}/api/auth/register", json={
        "name": "E2E User V2",
        "email": email,
        "password": "password123"
    })
    
    login_res = requests.post(f"http://localhost:{HTTP_PORT}/api/auth/login", json={
        "email": email,
        "password": "password123"
    })
    token = login_res.json()["token"]
    print("Registration and Login successful.")
except Exception as e:
    print("Registration/Login failed", e)
    exit(1)

# 2. Create a dynamic workspace
ws_res = requests.post(f"http://localhost:{HTTP_PORT}/api/workspaces", headers={"Authorization": f"Bearer {token}"}, json={
    "name": "E2E V2 Workspace"
})
workspace_id = ws_res.json()["workspace"]["id"]
print(f"Created Workspace: {workspace_id}")

# 3. Create a unique device for this test
device_name = f"V2_Sensor_{random.randint(1000, 9999)}"
create_dev = requests.post(f"http://localhost:{HTTP_PORT}/api/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {token}"}, json={
    "name": device_name,
    "device_type": "ESP32"
})
dev = create_dev.json()["device"]
DEVICE_ID = dev["device_id"]
SECRET_KEY = dev["secret_key"]
print(f"Created Device: {DEVICE_ID} / {device_name}")

# MQTT Setup
client = mqtt.Client(client_id=f"sim_{DEVICE_ID}")
client.username_pw_set(DEVICE_ID, SECRET_KEY)

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
    else:
        print(f"Failed to connect, return code {rc}")

client.on_connect = on_connect
client.connect(BROKER, PORT, 60)
client.loop_start()

time.sleep(1)

TOPIC = f"devices/{DEVICE_ID}/data"

# Test 1: Send basic initial payload
print("\n[TEST 1] Sending initial simple payload...")
payload1 = {
    "device_id": DEVICE_ID,
    "data": {
        "temperature": 25.5,
        "humidity": 40
    }
}
client.publish(TOPIC, json.dumps(payload1))
time.sleep(2)

# Verify Fields API
fields_res = requests.get(f"http://localhost:{HTTP_PORT}/api/workspaces/{workspace_id}/devices/{DEVICE_ID}/data-fields", headers={"Authorization": f"Bearer {token}"})
print("Discovered fields:", [f["field_name"] for f in fields_res.json()])

# Test 2: Send expanded dynamic payload
print("\n[TEST 2] Sending expanded payload with new fields...")
payload2 = {
    "device_id": DEVICE_ID,
    "data": {
        "temperature": 26.0,
        "humidity": 42,
        "motor_speed": 1450,
        "relay_active": True,
        "mode": "auto"
    }
}
client.publish(TOPIC, json.dumps(payload2))
time.sleep(2)

# Verify Fields API
fields_res = requests.get(f"http://localhost:{HTTP_PORT}/api/workspaces/{workspace_id}/devices/{DEVICE_ID}/data-fields", headers={"Authorization": f"Bearer {token}"})
print("Discovered fields after update:", [f["field_name"] for f in fields_res.json()])

# Test 3: Send malformed payload
print("\n[TEST 3] Sending malformed payload...")
client.publish(TOPIC, "{ malformed json ]")
time.sleep(1)
print("MQTT should survive this and keep running.")

# Test 4: Historical retention check
print("\n[TEST 4] Fetching historical records...")
history_res = requests.get(f"http://localhost:{HTTP_PORT}/api/workspaces/{workspace_id}/data?deviceId={DEVICE_ID}", headers={"Authorization": f"Bearer {token}"})
records = history_res.json()["records"]
print(f"Found {len(records)} records for device.")
for r in records:
    print(f"  - Record: {json.dumps(r['payload'])}")

# Test 5: Verify Cross Workspace Isolation (create Workspace B and try to fetch)
print("\n[TEST 5] Testing cross-workspace isolation...")
# create user 2
try:
    requests.post(f"http://localhost:{HTTP_PORT}/api/auth/register", json={
        "name": "User 2",
        "email": "user2@workspace.com",
        "password": "password123"
    })
except: pass

user2_res = requests.post(f"http://localhost:{HTTP_PORT}/api/auth/login", json={
    "email": "user2@workspace.com",
    "password": "password123"
})
token2 = user2_res.json()["token"]
ws2 = requests.post(f"http://localhost:{HTTP_PORT}/api/workspaces", headers={"Authorization": f"Bearer {token2}"}, json={"name": "Workspace 2"}).json()["workspace"]

# Try to fetch device 1 data fields using user 2
fail_res = requests.get(f"http://localhost:{HTTP_PORT}/api/workspaces/{ws2['id']}/devices/{DEVICE_ID}/data-fields", headers={"Authorization": f"Bearer {token2}"})
print(f"Isolation Check Status (Should be 403 or 404): {fail_res.status_code}")

print("\nTests complete. Simulator disconnecting.")
client.loop_stop()
client.disconnect()
