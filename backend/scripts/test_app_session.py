#!/usr/bin/env python3
import requests
import json
import sys
import time

# =================================================================
# CONFIGURATION
# =================================================================

# 1. User Credentials
EMAIL = "owner@iot.com"
PASSWORD = "password123"

# 2. Target API
API_URL = "http://localhost:5173/api/v1/routes/testing-command-api-175aec"

# Base URL for the platform
BASE_URL = "http://localhost:5173"

# =================================================================

def main():
    print("="*50)
    print(" MyDevice Command API E2E Tester")
    print("="*50)

    # Step 1: Authenticate
    print(f"\n[1] Authenticating as {EMAIL}...")
    try:
        login_res = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD}
        )
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")
        sys.exit(1)

    if login_res.status_code != 200:
        print(f"Login failed! Status: {login_res.status_code}")
        print(login_res.text)
        sys.exit(1)

    token = login_res.json().get("token")
    print("✓ Authentication successful! Token acquired.")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Fetch Schema
    print(f"\n[2] Fetching Command API Schema via GET {API_URL}...")
    schema_res = requests.get(API_URL, headers=headers)
    print(f"Status Code: {schema_res.status_code}")
    schema_data = schema_res.json()
    print("Response JSON:", json.dumps(schema_data, indent=2))
    
    if not schema_data.get("success"):
        sys.exit(1)
        
    allowed_devices = schema_data.get("api_allowed_devices", [])
    if not allowed_devices:
        print("No devices allowed for this route!")
        sys.exit(1)
        
    device_id = allowed_devices[0]

    # Step 3: Send Command
    print(f"\n[3] Sending Command via POST {API_URL}...")
    payload = {
        "device_id": device_id,
        "type": "SET_SPEED",
        "payload": {
            "speed": 1500
        }
    }
    print("Payload:", json.dumps(payload, indent=2))
    post_res = requests.post(API_URL, headers=headers, json=payload)
    print(f"Status Code: {post_res.status_code}")
    post_data = post_res.json()
    print("Response JSON:", json.dumps(post_data, indent=2))

    if not post_data.get("success"):
        sys.exit(1)
        
    command_id = post_data.get("command", {}).get("id")

    # Step 4: Check Command Status (Polling until Acknowledged/Completed)
    if command_id:
        print(f"\n[4] Polling Command Status via GET {API_URL}?command_id={command_id}...")
        status_url = f"{API_URL}?command_id={command_id}"
        
        max_attempts = 15
        for attempt in range(max_attempts):
            time.sleep(1) # wait 1 second between polls
            status_res = requests.get(status_url, headers=headers)
            
            if status_res.status_code != 200:
                print(f"Failed to fetch status: {status_res.status_code}")
                break
                
            status_data = status_res.json()
            command_info = status_data.get("command", {})
            current_status = command_info.get("status")
            
            print(f"  Attempt {attempt+1}/{max_attempts} - Status: {current_status}")
            
            if current_status not in ["PENDING", "SENT"]:
                print("\nFinal State Reached:")
                print(json.dumps(status_data, indent=2))
                break
        else:
            print(f"\nTimeout reached after {max_attempts} seconds. Command is still pending/sent.")

    print("\n" + "="*50)

if __name__ == "__main__":
    main()
