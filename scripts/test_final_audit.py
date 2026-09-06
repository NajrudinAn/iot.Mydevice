import requests
import json
import time
import paho.mqtt.client as mqtt

BASE_URL = "http://localhost:3000/api"
BROKER_URL = "localhost"
BROKER_PORT = 1883

print("--- 1. REGISTER USER ---")
email = f"audit_{int(time.time())}@test.com"
password = "password123"

res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Audit User",
    "email": email,
    "password": password
})
if res.status_code != 201 and res.status_code != 200:
    print(f"FAILED to register: {res.text}")
    exit(1)
user = res.json()["user"]
print(f"Registered user {user['email']} successfully.")

res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": email,
    "password": password
})
if res.status_code != 200:
    print(f"FAILED to login: {res.text}")
    exit(1)
token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

print("\n--- 2. CREATE WORKSPACE ---")
res = requests.post(f"{BASE_URL}/workspaces", json={
    "name": "Final Audit Workspace",
    "slug": f"audit-ws-{int(time.time())}"
}, headers=headers)
if res.status_code != 201:
    print(f"FAILED to create workspace: {res.text}")
    exit(1)
workspace_id = res.json()["workspace"]["id"]
print(f"Created Workspace ID: {workspace_id}")

print("\n--- 3. CREATE APPLICATION ---")
res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", json={
    "name": "Audit App",
    "slug": f"audit-app-{int(time.time())}"
}, headers=headers)
if res.status_code != 201:
    print(f"FAILED to create app: {res.text}")
    exit(1)
app_id = res.json()["application"]["id"]
print(f"Created Application ID: {app_id}")

print("\n--- 4. CREATE DEVICE ---")
res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", json={
    "name": "Audit Device",
    "device_type": "sensor"
}, headers=headers)
if res.status_code != 201:
    print(f"FAILED to create device: {res.text}")
    exit(1)
device = res.json()["device"]
device_id = device["device_id"]
secret_key = device["secret_key"]
db_device_id = device["id"]
print(f"Created Device ID: {device_id} (Secret: {secret_key})")

print("\n--- 5. ASSIGN DEVICE TO APPLICATION ---")
res = requests.post(f"{BASE_URL}/applications/{app_id}/devices", json={
    "device_id": db_device_id
}, headers=headers)
if res.status_code != 200:
    print(f"FAILED to assign device: {res.text}")
    exit(1)
print(f"Assigned device to application.")

print("\n--- 6. MQTT TELEMETRY SIMULATION ---")
# Wait 1s for application mappings to settle
time.sleep(1)

received_command = None
def on_message(client, userdata, msg):
    global received_command
    if "command" in msg.topic:
        received_command = json.loads(msg.payload.decode())

mqtt_client = mqtt.Client(client_id=device_id)
mqtt_client.username_pw_set(device_id, secret_key)
mqtt_client.on_message = on_message
mqtt_client.connect(BROKER_URL, BROKER_PORT)
mqtt_client.loop_start()

# Subscribe to commands
mqtt_client.subscribe(f"devices/{device_id}/command")

print("Publishing telemetry...")
payload = {
    "device_id": device_id,
    "data": {"temperature": 42.5, "humidity": 60.0}
}
mqtt_client.publish(f"devices/{device_id}/data", json.dumps(payload), qos=1)
time.sleep(1.5) # Wait for backend ingestion

print("\n--- 7. VERIFY TELEMETRY VIA API ---")
res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{db_device_id}/data", headers=headers)
if res.status_code != 200:
    print(f"FAILED to get latest data: {res.text}")
    exit(1)
data = res.json()
print(f"Latest data received via API: {data}")
found = False
for d in data.get("data", []):
    if d.get("temperature") == 42.5:
        found = True
if not found:
    print("FAILED to find published telemetry in API response!")
    exit(1)
print("Telemetry successfully verified in Database via API.")

print("\n--- 8. REMOTE COMMAND TEST ---")
res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{db_device_id}/command", json={
    "command": "LED_ON",
    "payload": {"brightness": 100}
}, headers=headers)
if res.status_code != 200:
    print(f"FAILED to send command: {res.text}")
    exit(1)
print("Command sent via API.")

time.sleep(1)
if not received_command or received_command.get("command") != "LED_ON":
    print("FAILED: Device did not receive the MQTT command payload.")
    exit(1)
print(f"Device successfully received MQTT command payload: {received_command}")

print("\n--- 9. API KEY GENERATION (CUSTOM FRONTEND TEST) ---")
res = requests.post(f"{BASE_URL}/applications/{app_id}/apis", json={
    "name": "Audit API",
    "slug": "audit-api",
    "description": "audit api"
}, headers=headers)
if res.status_code != 201:
    print(f"FAILED to generate API: {res.text}")
    exit(1)
api_def_id = res.json()["api"]["id"]

res = requests.post(f"{BASE_URL}/applications/{app_id}/apis/{api_def_id}/devices/{db_device_id}", headers=headers)

res = requests.post(f"{BASE_URL}/applications/{app_id}/apis/{api_def_id}/keys", json={
    "name": "Custom Frontend Key",
    "expires_in_days": 30
}, headers=headers)
if res.status_code != 201:
    print(f"FAILED to generate API key: {res.text}")
    exit(1)
api_key = res.json()["key_record"]
raw_key = res.json().get("raw_api_key", res.json().get("raw_key"))
print(f"Generated API Key: {raw_key}")

print("Fetching data using API Key (no user token)...")
api_headers = {"x-api-key": raw_key}
res = requests.get(f"{BASE_URL}/v1/applications/{app_id}/public-api/audit-api", headers=api_headers)
if res.status_code != 200:
    print(f"FAILED to fetch with API key: {res.text}")
    exit(1)
print("Successfully fetched telemetry using API Key.")

print("\n--- 10. ROLE SECURITY VERIFICATION (VIEWER) ---")
# Create a VIEWER user
viewer_email = f"viewer_{int(time.time())}@test.com"
res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Viewer User",
    "email": viewer_email,
    "password": password
})
viewer_id = res.json()["user"]["id"]

res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": viewer_email,
    "password": password
})
viewer_token = res.json()["token"]
viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

# Add viewer to application
res = requests.post(f"{BASE_URL}/applications/{app_id}/users", json={
    "user_id": viewer_id,
    "role": "VIEWER"
}, headers=headers) # Using admin headers to add user

# Try to send command as viewer
res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{db_device_id}/command", json={
    "command": "ILLEGAL_CMD"
}, headers=viewer_headers)

if res.status_code == 403:
    print("SUCCESS: Viewer was correctly blocked from sending a command (403).")
else:
    print(f"FAILED: Viewer was not blocked! Status: {res.status_code}")
    exit(1)

mqtt_client.loop_stop()
mqtt_client.disconnect()

print("\n=============================================")
print("✅ ALL TESTS PASSED. REAL SYSTEM VERIFIED.")
print("=============================================")
