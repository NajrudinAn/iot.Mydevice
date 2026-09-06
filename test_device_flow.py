import requests
import json
import subprocess
import time

BASE_URL = "http://localhost:3000/api"

# 1. Register User
email = f"test_{int(time.time())}@test.com"
res = requests.post(f"{BASE_URL}/auth/register", json={"name": "Test User", "email": email, "password": "password123"})
if res.status_code != 201:
    print("User creation failed")
    exit(1)
token = res.json()['token']
headers = {"Authorization": f"Bearer {token}"}

# 2. Create Workspace
res = requests.post(f"{BASE_URL}/workspaces", json={"name": "My Workspace"}, headers=headers)
workspace_id = res.json()['workspace']['id']

# 3. Create Device
res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", json={"name": "Test Sensor", "device_type": "ESP32"}, headers=headers)
device_data = res.json()['device']
device_id = device_data['device_id']
secret_key = device_data['secret_key']
device_uuid = device_data['id']

print(f"Created Device: {device_id} with Secret: {secret_key}")

# 4. Run Simulator
print("Running simulator...")
cmd = ["python3", "scripts/test_mqtt_device.py", "--device-id", device_id, "--secret-key", secret_key, "--count", "3"]
result = subprocess.run(cmd, capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print(result.stderr)
    exit(1)

# 5. Check Device Status
res = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/devices/{device_uuid}", headers=headers)
status = res.json()['device']['status']
last_seen = res.json()['device']['last_seen']
print(f"Backend Device Status: {status}")
print(f"Backend Last Seen: {last_seen}")

if status != 'ONLINE' and status != 'online':
    print("Status did not update to online!")
    exit(1)

print("E2E Test Passed!")
