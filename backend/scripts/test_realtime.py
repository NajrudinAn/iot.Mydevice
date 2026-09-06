#!/usr/bin/env python3
import requests
import json
import sys

# =================================================================
# CONFIGURATION
# =================================================================

# 1. User Credentials
EMAIL = "owner@iot.com"
PASSWORD = "password123"

# 2. Target API (From the screenshot)
API_URL = "http://localhost:5173/api/v1/routes/testing-the-realtime-3725da"

# Base URL for the platform
BASE_URL = "http://localhost:5173"

# =================================================================

def main():
    print("="*50)
    print(" MyDevice Realtime (SSE) API Tester")
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
        "Accept": "text/event-stream"
    }

    # Step 2: Connect to Realtime Stream
    print(f"\n[2] Connecting to Realtime Stream via GET {API_URL}...")
    
    try:
        # stream=True is critical for SSE
        with requests.get(API_URL, headers=headers, stream=True) as response:
            if response.status_code != 200:
                print(f"Failed to connect! Status: {response.status_code}")
                print(response.text)
                sys.exit(1)
            
            print("✓ Connected! Listening for realtime events...\n")
            print("--- STREAM LOG ---")
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('event:'):
                        print(f"\n[EVENT] {decoded_line.replace('event: ', '')}")
                    elif decoded_line.startswith('data:'):
                        try:
                            # Try to pretty print the JSON data
                            data_json = json.loads(decoded_line.replace('data: ', ''))
                            print(f"  [DATA] {json.dumps(data_json, indent=2)}")
                        except json.JSONDecodeError:
                            # Fallback if it's not valid JSON
                            print(f"  [DATA] {decoded_line}")
                    elif decoded_line.startswith(':'):
                        # It's a comment/keep-alive from SSE
                        print(f"  [KEEP-ALIVE]")
                    else:
                        print(f"  [UNKNOWN] {decoded_line}")
    except KeyboardInterrupt:
        print("\n\n--- Connection Closed by User ---")
    except Exception as e:
        print(f"\nConnection lost: {e}")

if __name__ == "__main__":
    main()
