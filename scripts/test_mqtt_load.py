import subprocess
import requests
import time
import threading
import sys

# Change these to match a user registered on your backend
EMAIL = "loadtest@example.com"
PASSWORD = "password123"
BASE_URL = "http://localhost:3000/api"

def register_user_and_login():
    # Attempt login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    
    if login_res.status_code == 401:
        print("User does not exist or wrong password. Registering...")
        requests.post(f"{BASE_URL}/auth/register", json={
            "name": "Load Tester",
            "email": EMAIL,
            "password": PASSWORD
        })
        login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        
    if login_res.status_code != 200:
        print("Failed to authenticate.")
        sys.exit(1)
        
    return login_res.json()["token"]

def register_device(token, index):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/devices", json={
        "name": f"Simulated Device {index}",
        "device_type": "ESP32"
    }, headers=headers)
    
    if res.status_code != 201:
        print(f"Failed to register device {index}: {res.text}")
        sys.exit(1)
        
    return res.json()["device"]

def run_simulation(device_id, secret_key, count):
    print(f"Starting simulation thread for {device_id}...")
    subprocess.run([
        "python3", "scripts/test_mqtt_device.py",
        "--device-id", device_id,
        "--secret-key", secret_key,
        "--count", str(count),
        "--interval", "0.2"
    ])

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--devices', type=int, default=3)
    parser.add_argument('--messages', type=int, default=10)
    args = parser.parse_args()
    
    print("--- MQTT MULTI-DEVICE LOAD TEST ---")
    token = register_user_and_login()
    print("Authenticated successfully.")
    
    devices = []
    for i in range(args.devices):
        dev = register_device(token, i+1)
        devices.append(dev)
        print(f"Registered {dev['device_id']}")
        
    threads = []
    for dev in devices:
        t = threading.Thread(target=run_simulation, args=(dev['device_id'], dev['secret_key'], args.messages))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    print("All simulations completed.")
    print("Verifying database records via API...")
    
    headers = {"Authorization": f"Bearer {token}"}
    for dev in devices:
        res = requests.get(f"{BASE_URL}/devices/{dev['device_id']}", headers=headers)
        if res.status_code == 200:
            status = res.json()["device"]["status"]
            print(f"Device {dev['device_id']} status in DB: {status}")

if __name__ == "__main__":
    main()
