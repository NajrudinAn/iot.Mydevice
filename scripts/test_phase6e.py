import requests
import json
import uuid

BASE_URL = "http://localhost:3000/api"

def register_user(name, email, password):
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    res_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    data = res_login.json()
    
    if res.status_code == 201:
        user_id = res.json()["user"]["id"]
    else:
        import jwt
        decoded = jwt.decode(data["token"], options={"verify_signature": False})
        user_id = decoded["id"]
        
    return data["token"], user_id

def app_login(app_id, email, password):
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": email,
        "password": password
    })
    return res

def run_tests():
    print("--- Starting Phase 6E Python Integration Test ---")
    
    # 1. Register/login users
    owner_email = f"owner_6e_{uuid.uuid4().hex[:6]}@test.com"
    owner_token, owner_id = register_user("Owner 6E", owner_email, "pass123")
    
    operator_email = f"op_6e_{uuid.uuid4().hex[:6]}@test.com"
    operator_token, operator_id = register_user("Op 6E", operator_email, "pass123")
    
    viewer_email = f"view_6e_{uuid.uuid4().hex[:6]}@test.com"
    viewer_token, viewer_id = register_user("View 6E", viewer_email, "pass123")
    
    # 2. Create workspace
    res = requests.post(f"{BASE_URL}/workspaces", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "WS 6E"})
    workspace_id = res.json()["workspace"]["id"]
    
    # 3. Create Application
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "App 6E"})
    app_id = res.json()["application"]["id"]
    
    # Add members to App
    requests.post(f"{BASE_URL}/applications/{app_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": operator_email, "role": "OPERATOR"})
    requests.post(f"{BASE_URL}/applications/{app_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": viewer_email, "role": "VIEWER"})
    
    # Get Application Tokens
    app_admin_token = app_login(app_id, owner_email, "pass123").json()["token"]
    app_operator_token = app_login(app_id, operator_email, "pass123").json()["token"]
    app_viewer_token = app_login(app_id, viewer_email, "pass123").json()["token"]
    
    # Create Devices
    device_a = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "Dev A", "device_type": "ESP32"}).json()["device"]["device_id"]
    device_b = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "Dev B", "device_type": "ESP32"}).json()["device"]["device_id"]
    device_c = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "Dev C", "device_type": "ESP32"}).json()["device"]["device_id"]
    
    # Assign Devices to App
    requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"device_id": device_a})
    requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"device_id": device_b})
    requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"device_id": device_c})
    
    # Base Role Tests
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device_a}/command", headers={"Authorization": f"Bearer {app_admin_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 200, "ADMIN failed base command access"
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device_a}/command", headers={"Authorization": f"Bearer {app_operator_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 200, "OPERATOR failed base command access"
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device_a}/command", headers={"Authorization": f"Bearer {app_viewer_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 403, "VIEWER illegally executed command"
    
    print("✅ Base role behaviors verified")

    # Override: Restrict Operator on Device B
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/devices/{device_b}/permissions", headers={"Authorization": f"Bearer {app_admin_token}"}, json={"user_id": operator_id, "can_command": False})
    assert res.status_code == 200
    
    # Operator Device B Command -> Should Fail
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device_b}/command", headers={"Authorization": f"Bearer {app_operator_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 403, "OPERATOR executed command on restricted device"
    print("✅ Operator restricted via device permission override")
    
    # Operator Device A Command -> Should Pass (no leakage)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device_a}/command", headers={"Authorization": f"Bearer {app_operator_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 200, "Cross-device permission leakage detected"
    print("✅ No cross-device permission leakage")
    
    # Override: Attempt to escalate Viewer on Device C
    requests.patch(f"{BASE_URL}/applications/{app_id}/devices/{device_c}/permissions", headers={"Authorization": f"Bearer {app_admin_token}"}, json={"user_id": viewer_id, "can_command": True})
    
    # Viewer Device C Command -> Should Fail (Role Max blocks it)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices/{device_c}/command", headers={"Authorization": f"Bearer {app_viewer_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 403, "VIEWER escalated privileges through device permission"
    print("✅ Viewer cannot escalate privileges (Role Max intersection enforced)")
    
    # Ensure Viewer can still view
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device_c}/data", headers={"Authorization": f"Bearer {app_viewer_token}"})
    assert res.status_code == 200
    print("✅ Viewer retains view access")
    
    # Unassigned Device test
    device_un = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "Dev Un", "device_type": "ESP32"}).json()["device"]["device_id"]
    res = requests.get(f"{BASE_URL}/applications/{app_id}/devices/{device_un}/data", headers={"Authorization": f"Bearer {app_admin_token}"})
    assert res.status_code == 403, "Admin accessed unassigned device through application context"
    print("✅ Unassigned device isolated from application context")

    print("\n✅ PHASE 6E PYTHON E2E TESTS PASSED SUCCESSFULLY ✅")

if __name__ == "__main__":
    run_tests()
