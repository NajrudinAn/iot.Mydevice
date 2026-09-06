import os
import time
import json
import random
import requests
import paho.mqtt.client as mqtt
import threading

BASE_URL = "http://localhost:3000/api"
MQTT_BROKER = "localhost"
MQTT_PORT = 1883

def register_user(email, password, name):
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    return res.json()

def login_user(email, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    token = res.json()["token"]
    
    # decode JWT (no signature verification needed for just grabbing the ID in a test script)
    import base64
    payload_b64 = token.split('.')[1]
    # pad base64
    payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
    payload = json.loads(base64.b64decode(payload_b64).decode('utf-8'))
    
    return token, payload["id"]

def main():
    print("=== SEEDING DEVSYNC DATABASE ===")
    timestamp = int(time.time())
    
    # 1. Create Users
    admin_email = f"admin_{timestamp}@test.com"
    operator_email = f"op_{timestamp}@test.com"
    viewer_email = f"view_{timestamp}@test.com"
    password = "Password123!"

    register_user(admin_email, password, "Admin User")
    register_user(operator_email, password, "Operator User")
    register_user(viewer_email, password, "Viewer User")

    print(f"\n--- CREDENTIALS ---")
    print(f"ADMIN:    {admin_email} / {password}")
    print(f"OPERATOR: {operator_email} / {password}")
    print(f"VIEWER:   {viewer_email} / {password}")
    print(f"-------------------\n")

    # 2. Login Admin
    admin_token, admin_id = login_user(admin_email, password)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Create Workspace
    res = requests.post(f"{BASE_URL}/workspaces", json={
        "name": "Live Demo Workspace",
        "slug": f"demo-ws-{timestamp}"
    }, headers=headers)
    ws_id = res.json()["workspace"]["id"]

    # 4. Create Application
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={
        "name": "Simulated Live App",
        "slug": f"demo-app-{timestamp}"
    }, headers=headers)
    app_id = res.json()["application"]["id"]
    app_slug = res.json()["application"]["slug"]

    # 5. Add Operator and Viewer to Application
    op_token, op_id = login_user(operator_email, password)
    view_token, view_id = login_user(viewer_email, password)

    requests.post(f"{BASE_URL}/applications/{app_id}/users", json={"user_id": op_id, "role": "OPERATOR"}, headers=headers)
    requests.post(f"{BASE_URL}/applications/{app_id}/users", json={"user_id": view_id, "role": "VIEWER"}, headers=headers)

    # 6. Create 3 Devices
    devices = []
    for i in range(3):
        res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/devices", json={
            "name": f"Sensor Unit 00{i+1}",
            "device_type": "sensor"
        }, headers=headers)
        
        device_data = res.json()["device"]
        db_device_id = device_data["id"]
        mqtt_client_id = device_data["device_id"]
        mqtt_password = device_data["secret_key"]
        
        # Assign to application
        requests.post(f"{BASE_URL}/applications/{app_id}/devices", json={"device_id": db_device_id}, headers=headers)
        
        devices.append({
            "client_id": mqtt_client_id,
            "password": mqtt_password,
            "db_id": db_device_id,
            "name": f"Sensor Unit 00{i+1}"
        })
        print(f"Created & Assigned Device: {mqtt_client_id}")

    print(f"\nWorkspace ID: {ws_id}")
    print(f"Application ID: {app_id}")
    print(f"Custom Hosted App URL: http://localhost:3000/hosted/{app_slug}\n")

    # 7. Start MQTT Simulation Threads
    print("=== STARTING LIVE TELEMETRY SIMULATION ===")
    print("Press Ctrl+C to stop.")
    
    threads = []
    for i, dev in enumerate(devices):
        t = threading.Thread(target=simulate_device, args=(dev["client_id"], dev["password"], i))
        t.daemon = True
        t.start()
        threads.append(t)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping simulation...")

def simulate_device(client_id, password, device_index):
    client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
    client.username_pw_set(client_id, password)
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
    except Exception as e:
        print(f"[{client_id}] Connection failed: {e}")
        return

    print(f"[{client_id}] Connected. Publishing telemetry...")
    
    payloads_device_0 = [
        {"sensor1": {"temperature": 25.5, "humidity": 40}},
        {"sensor2": {"pressure": 1012, "light": 450}},
        {"motor": {"speed": 1450, "current": 2.4}},
        {"device_state": {"battery": 91, "signal_strength": -62}},
        {"events": {"motion": True, "alarm": False}}
    ]
    
    payload_device_1 = {"factory": {"conveyor_belt": True, "speed": 400}, "alerts": {"vibration": False}}
    payload_device_2 = {"flat_temperature": 25.4, "flat_humidity": 61, "status": "active"}
    
    step = 0
    while True:
        data = {}
        if device_index == 0:
            data = payloads_device_0[step % len(payloads_device_0)]
        elif device_index == 1:
            data = payload_device_1
        else:
            data = payload_device_2
            
        payload = json.dumps({
            "device_id": client_id,
            "data": data
        })
        
        client.publish(f"devices/{client_id}/data", payload, qos=1)
        step += 1
        time.sleep(5)

if __name__ == "__main__":
    main()
