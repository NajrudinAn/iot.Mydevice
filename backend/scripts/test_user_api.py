import requests
import json
import time

BASE_URL = "http://localhost:5173/api/v1/routes"
API_KEY = "ds_3021beff5fb6a7eb66254d39"
API_SECRET = "UdDu4UQPur2p7Zabkqrd9So8e_NszasjQ-Rk2Uh3UK8"

HEADERS = {
    "X-API-Key": API_KEY,
    "X-API-Secret": API_SECRET,
    "Content-Type": "application/json"
}

def print_result(name, res):
    print(f"\n{'='*50}\nTesting: {name}")
    print(f"Status: {res.status_code}")
    try:
        print(json.dumps(res.json(), indent=2))
    except:
        print(res.text)

# 1. CURRENT_DATA
res = requests.get(f"{BASE_URL}/test-working-cad9d9?limit=2", headers=HEADERS)
print_result("CURRENT_DATA", res)

# 2. HISTORY
res = requests.get(f"{BASE_URL}/testing-historical-datat-867673?limit=2", headers=HEADERS)
print_result("HISTORY", res)

# 3. COMMAND SCHEMA DISCOVERY
res = requests.get(f"{BASE_URL}/testing-command-api-175aec", headers=HEADERS)
print_result("COMMAND SCHEMA DISCOVERY", res)

# 4. COMMAND EXECUTION
# Assuming schema returns TURN_ON or similar, we just try it generically if we have a device
payload = {
    "type": "TURN_ON",
    "payload": { "intensity": 80 }
}
res = requests.post(f"{BASE_URL}/testing-command-api-175aec", headers=HEADERS, json=payload)
print_result("COMMAND POST", res)

# 5. REALTIME (SSE)
print(f"\n{'='*50}\nTesting: REALTIME SSE (Stream)")
try:
    with requests.get(f"{BASE_URL}/testing-the-realtime-3725da", headers=HEADERS, stream=True, timeout=5) as r:
        print(f"Status: {r.status_code}")
        count = 0
        for line in r.iter_lines():
            if line:
                print(line.decode('utf-8'))
                count += 1
                if count >= 6: # read a few lines
                    break
except Exception as e:
    print(f"Stream ended or error: {e}")

