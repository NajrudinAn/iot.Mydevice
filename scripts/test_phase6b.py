import requests
import uuid
import json

BASE_URL = "http://localhost:3000/api"

def print_result(test_id, name, success, details=""):
    status = "PASS" if success else "FAIL"
    print(f"{test_id.ljust(6)} | {name.ljust(35)} | {status.ljust(5)} | {details}")
    if not success:
        global ALL_PASS
        ALL_PASS = False

ALL_PASS = True

try:
    print("--------------------------------------------------------------------------------")
    print("ID     | Test                                | Result | Method/Details")
    print("--------------------------------------------------------------------------------")
    
    # 1. Register User A & B
    email_a = f"a_{uuid.uuid4()}@test.com"
    email_b = f"b_{uuid.uuid4()}@test.com"
    requests.post(f"{BASE_URL}/auth/register", json={"name": "Test User A", "email": email_a, "password": "password123"})
    requests.post(f"{BASE_URL}/auth/register", json={"name": "Test User B", "email": email_b, "password": "password123"})
    
    token_a = requests.post(f"{BASE_URL}/auth/login", json={"email": email_a, "password": "password123"}).json()['token']
    token_b = requests.post(f"{BASE_URL}/auth/login", json={"email": email_b, "password": "password123"}).json()['token']
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Workspaces
    ws_a = requests.get(f"{BASE_URL}/workspaces", headers=headers_a).json()['workspaces'][0]['id']
    ws_b = requests.get(f"{BASE_URL}/workspaces", headers=headers_b).json()['workspaces'][0]['id']

    # Devices
    dev_a1 = requests.post(f"{BASE_URL}/workspaces/{ws_a}/devices", json={"name": "Dev A1", "device_type": "ESP32"}, headers=headers_a).json()['device']
    dev_a2 = requests.post(f"{BASE_URL}/workspaces/{ws_a}/devices", json={"name": "Dev A2", "device_type": "ESP32"}, headers=headers_a).json()['device']
    dev_b1 = requests.post(f"{BASE_URL}/workspaces/{ws_b}/devices", json={"name": "Dev B1", "device_type": "ESP32"}, headers=headers_b).json()['device']

    # Create application A in Workspace A
    res_app_a = requests.post(f"{BASE_URL}/workspaces/{ws_a}/applications", json={"name": "App A", "description": "Desc A"}, headers=headers_a)
    print_result("6B-04", "Create application", res_app_a.status_code == 201)
    app_a = res_app_a.json()['application']

    # List applications
    res_list = requests.get(f"{BASE_URL}/workspaces/{ws_a}/applications", headers=headers_a)
    print_result("6B-05", "List applications", res_list.status_code == 200 and len(res_list.json()['applications']) > 0)

    # App details
    res_details = requests.get(f"{BASE_URL}/applications/{app_a['id']}", headers=headers_a)
    print_result("6B-06", "Application details", res_details.status_code == 200)

    # Update app
    res_update = requests.patch(f"{BASE_URL}/applications/{app_a['id']}", json={"description": "Updated"}, headers=headers_a)
    print_result("6B-07", "Update application", res_update.status_code == 200 and res_update.json()['application']['description'] == 'Updated')

    # Assign device A1
    res_assign = requests.post(f"{BASE_URL}/applications/{app_a['id']}/devices", json={"device_id": dev_a1['device_id']}, headers=headers_a)
    print_result("6B-09", "Assign device", res_assign.status_code == 200)

    # List devices
    res_app_devs = requests.get(f"{BASE_URL}/applications/{app_a['id']}/devices", headers=headers_a)
    print_result("6B-10", "List devices", res_app_devs.status_code == 200 and len(res_app_devs.json()['devices']) == 1)

    # Duplicate association
    res_dup = requests.post(f"{BASE_URL}/applications/{app_a['id']}/devices", json={"device_id": dev_a1['device_id']}, headers=headers_a)
    print_result("6B-12", "Duplicate association", res_dup.status_code == 200)

    # Cross workspace assignment (App A + Dev B1)
    res_cross = requests.post(f"{BASE_URL}/applications/{app_a['id']}/devices", json={"device_id": dev_b1['device_id']}, headers=headers_a)
    print_result("6B-13", "Cross-workspace assignment", res_cross.status_code == 403)

    # Cross user application access (User B accessing App A)
    res_cross_user = requests.get(f"{BASE_URL}/applications/{app_a['id']}", headers=headers_b)
    print_result("6B-14", "Cross-user application access", res_cross_user.status_code in [403, 404])

    # Unauthenticated access
    res_unauth = requests.get(f"{BASE_URL}/applications/{app_a['id']}")
    print_result("6B-15", "Unauthenticated access", res_unauth.status_code == 401)

    # Remove device
    res_remove = requests.delete(f"{BASE_URL}/applications/{app_a['id']}/devices/{dev_a1['device_id']}", headers=headers_a)
    print_result("6B-11", "Remove device", res_remove.status_code == 200)

    # Multi-application & Multi-device
    res_app_b_req = requests.post(f"{BASE_URL}/workspaces/{ws_a}/applications", json={"name": "App B"}, headers=headers_a)
    if res_app_b_req.status_code != 201:
        print(f"Failed to create app B: {res_app_b_req.text}")
    app_b = res_app_b_req.json()['application']
    
    requests.post(f"{BASE_URL}/applications/{app_a['id']}/devices", json={"device_id": dev_a1['device_id']}, headers=headers_a)
    requests.post(f"{BASE_URL}/applications/{app_a['id']}/devices", json={"device_id": dev_a2['device_id']}, headers=headers_a)
    requests.post(f"{BASE_URL}/applications/{app_b['id']}/devices", json={"device_id": dev_a2['device_id']}, headers=headers_a)
    
    list_b = requests.get(f"{BASE_URL}/applications/{app_b['id']}/devices", headers=headers_a).json()['devices']
    print_result("6B-18", "Multi-application", len(list_b) == 1 and list_b[0]['device_id'] == dev_a2['device_id'])
    
    # Delete application
    res_del = requests.delete(f"{BASE_URL}/applications/{app_a['id']}", headers=headers_a)
    print_result("6B-08", "Delete application", res_del.status_code == 200)

    # Secret exposure check
    list_after = requests.get(f"{BASE_URL}/applications/{app_b['id']}/devices", headers=headers_a).json()['devices']
    is_safe = 'secret_key' not in list_after[0]
    print_result("6B-23", "Secret exposure check", is_safe)

    print("--------------------------------------------------------------------------------")
    print(f"Integration Tests {'PASSED' if ALL_PASS else 'FAILED'}")

except Exception as e:
    print(f"Error during tests: {e}")
