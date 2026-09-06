import requests
import uuid
import threading
import time

BASE_URL = "http://localhost:3000/api"

# 1. Register User & Workspace
email = f"load_{uuid.uuid4()}@test.com"
requests.post(f"{BASE_URL}/auth/register", json={"name": "Load User", "email": email, "password": "password123"})
token = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "password123"}).json()['token']
headers = {"Authorization": f"Bearer {token}"}
ws_id = requests.get(f"{BASE_URL}/workspaces", headers=headers).json()['workspaces'][0]['id']

# Create 5 devices
devices = []
for i in range(5):
    dev = requests.post(f"{BASE_URL}/workspaces/{ws_id}/devices", json={"name": f"Dev {i}", "device_type": "ESP32"}, headers=headers).json()['device']
    devices.append(dev)

success_count = 0
fail_count = 0
lock = threading.Lock()

def worker(app_idx):
    global success_count, fail_count
    try:
        # Create app
        res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={"name": f"Load App {app_idx}"}, headers=headers)
        if res.status_code != 201:
            with lock: fail_count += 1
            return
        app_id = res.json()['application']['id']
        
        # Assign 2 devices
        for d in devices[:2]:
            r = requests.post(f"{BASE_URL}/applications/{app_id}/devices", json={"device_id": d['device_id']}, headers=headers)
            if r.status_code != 200:
                with lock: fail_count += 1
                return
        
        # List devices
        r = requests.get(f"{BASE_URL}/applications/{app_id}/devices", headers=headers)
        if r.status_code != 200:
            with lock: fail_count += 1
            return
            
        with lock: success_count += 1
    except Exception as e:
        with lock: fail_count += 1

threads = []
for i in range(20):
    t = threading.Thread(target=worker, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print(f"6B-21 | Concurrency Test | PASS if fails==0 | Success: {success_count}, Fail: {fail_count}")
