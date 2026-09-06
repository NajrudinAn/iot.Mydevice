import requests
import json
import uuid

BASE_URL = "http://localhost:3000/api"

# Helper to register and get token
def register_user(name, email, password):
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    
    # Login to get token
    res_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    data = res_login.json()
    
    if res.status_code == 201:
        user_id = res.json()["user"]["id"]
    else:
        # If already exists, we might need to get user_id by another means, 
        # but for this script we always use fresh uuids.
        # Just in case, decode JWT
        import jwt
        decoded = jwt.decode(data["token"], options={"verify_signature": False})
        user_id = decoded["id"]
        
    return data["token"], user_id

def run_tests():
    print("--- Starting Phase 6C Python Integration Test ---")
    
    # 1. Register/login users
    owner_token, owner_id = register_user("App Owner", f"owner_app_{uuid.uuid4().hex[:6]}@test.com", "pass123")
    operator_email = f"operator_app_{uuid.uuid4().hex[:6]}@test.com"
    operator_token, operator_id = register_user("App Operator", operator_email, "pass123")
    viewer_email = f"viewer_app_{uuid.uuid4().hex[:6]}@test.com"
    viewer_token, viewer_id = register_user("App Viewer", viewer_email, "pass123")
    
    # 2. Create workspace
    res = requests.post(f"{BASE_URL}/workspaces", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "Integration WS"})
    workspace_id = res.json()["workspace"]["id"]
    
    # 3. Create application
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "Integration App"})
    app_id = res.json()["application"]["id"]
    
    # 4. Verify creator becomes ADMIN
    res = requests.get(f"{BASE_URL}/applications/{app_id}/users", headers={"Authorization": f"Bearer {owner_token}"})
    users = res.json()["users"]
    admin_user = next((u for u in users if u["id"] == owner_id), None)
    assert admin_user is not None, "Owner not found in app users"
    assert admin_user["role"] == "ADMIN", "Owner is not ADMIN"
    print("✅ Creator becomes ADMIN")
    
    # 5. Add OPERATOR
    res = requests.post(f"{BASE_URL}/applications/{app_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": operator_email, "role": "OPERATOR"})
    assert res.status_code == 201, f"Failed to add OPERATOR: {res.text}"
    print("✅ Add OPERATOR")
    
    # 6. Add VIEWER
    res = requests.post(f"{BASE_URL}/applications/{app_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": viewer_email, "role": "VIEWER"})
    assert res.status_code == 201, "Failed to add VIEWER"
    print("✅ Add VIEWER")
    
    # 8. Create/assign devices
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "AppDev1", "device_type": "ESP32"})
    device1_id = res.json()["device"]["device_id"]
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"device_id": device1_id})
    assert res.status_code == 200, "Failed to assign device"
    print("✅ Device assigned")
    
    # 9. Test telemetry access
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/data", headers={"Authorization": f"Bearer {operator_token}"})
    assert res.status_code == 200, "OPERATOR failed to read telemetry"
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/data", headers={"Authorization": f"Bearer {viewer_token}"})
    assert res.status_code == 200, "VIEWER failed to read telemetry"
    print("✅ Telemetry access tests passed")
    
    # 10. Test command access
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/command", headers={"Authorization": f"Bearer {viewer_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 403, "VIEWER was able to execute command"
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/command", headers={"Authorization": f"Bearer {operator_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 200, "OPERATOR failed to execute command"
    print("✅ Command access tests passed")
    
    # 11. Test unauthorized device
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "AppDev2", "device_type": "ESP32"})
    device2_id = res.json()["device"]["device_id"]
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device2_id}/data", headers={"Authorization": f"Bearer {operator_token}"})
    assert res.status_code == 403, "OPERATOR accessed unassigned device"
    print("✅ Unassigned device isolation passed")
    
    # 13. Test disabled user
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/users/{operator_id}", headers={"Authorization": f"Bearer {owner_token}"}, json={"status": "DISABLED"})
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/data", headers={"Authorization": f"Bearer {operator_token}"})
    assert res.status_code == 403, "DISABLED operator was able to access telemetry"
    print("✅ Disabled user isolation passed")
    
    # 14. Test role changes
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/users/{viewer_id}", headers={"Authorization": f"Bearer {owner_token}"}, json={"role": "OPERATOR"})
    assert res.status_code == 200, "Failed to change role"
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/command", headers={"Authorization": f"Bearer {viewer_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 200, "Upgraded viewer could not execute command"
    print("✅ Role change passed")
    
    # 15. Test user removal
    res = requests.delete(f"{BASE_URL}/applications/{app_id}/users/{viewer_id}", headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 200, "Failed to remove user"
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device1_id}/data", headers={"Authorization": f"Bearer {viewer_token}"})
    assert res.status_code == 403, "Removed user was still able to access telemetry"
    print("✅ User removal passed")
    
    # 16. Test last-admin protection
    res = requests.delete(f"{BASE_URL}/applications/{app_id}/users/{owner_id}", headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 400, "Removed the last ADMIN"
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/users/{owner_id}", headers={"Authorization": f"Bearer {owner_token}"}, json={"role": "OPERATOR"})
    assert res.status_code == 400, "Demoted the last ADMIN"
    print("✅ Last-admin protection passed")
    
    print("\n✅ PHASE 6C INTEGRATION TESTS PASSED SUCCESSFULLY ✅")

if __name__ == "__main__":
    run_tests()
