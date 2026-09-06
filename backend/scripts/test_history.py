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

# 2. Target API (From the prompt)
API_URL = "http://localhost:5173/api/v1/routes/testing-historical-datat-867673"

# Base URL for the platform
BASE_URL = "http://localhost:5173"

# =================================================================

def main():
    print("="*50)
    print(" MyDevice History API Tester")
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
        "Accept": "application/json"
    }

    # Step 2: Test basic history fetch
    print(f"\n[2] Fetching default History (limit=2)...")
    res = requests.get(f"{API_URL}?limit=2", headers=headers)
    print(f"Status Code: {res.status_code}")
    print("Response JSON (Default):", json.dumps(res.json(), indent=2))

    # Step 3: Test pagination
    print(f"\n[3] Fetching page 2 of History (limit=2)...")
    res2 = requests.get(f"{API_URL}?limit=2&page=2", headers=headers)
    print(f"Status Code: {res2.status_code}")
    print("Response JSON (Page 2):", json.dumps(res2.json(), indent=2))
    
    # Step 4: Test Date filtering
    print(f"\n[4] Fetching History with Date Filtering (start_date=2024-01-01)...")
    res3 = requests.get(f"{API_URL}?limit=5&start_date=2024-01-01T00:00:00Z", headers=headers)
    print(f"Status Code: {res3.status_code}")
    
    data = res3.json()
    print(f"Got {len(data.get('data', []))} records. Pagination metadata:")
    print(json.dumps(data.get('pagination', {}), indent=2))
    
    print("\n✓ Tests complete!")

if __name__ == "__main__":
    main()
