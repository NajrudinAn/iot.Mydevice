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
    print("--- Starting Phase 6D Python Integration Test ---")
    
    # 1. Register/login users
    owner_email = f"owner_6d_{uuid.uuid4().hex[:6]}@test.com"
    owner_token, owner_id = register_user("Owner 6D", owner_email, "pass123")
    
    operator_email = f"op_6d_{uuid.uuid4().hex[:6]}@test.com"
    operator_token, operator_id = register_user("Op 6D", operator_email, "pass123")
    
    viewer_email = f"view_6d_{uuid.uuid4().hex[:6]}@test.com"
    viewer_token, viewer_id = register_user("View 6D", viewer_email, "pass123")
    
    disabled_email = f"dis_6d_{uuid.uuid4().hex[:6]}@test.com"
    dis_token, dis_id = register_user("Dis 6D", disabled_email, "pass123")
    
    plat_email = f"plat_6d_{uuid.uuid4().hex[:6]}@test.com"
    plat_token, plat_id = register_user("Plat 6D", plat_email, "pass123")
    
    # 2. Create workspace
    res = requests.post(f"{BASE_URL}/workspaces", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "WS 6D"})
    workspace_id = res.json()["workspace"]["id"]
    
    # 3. Create Applications
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "App1 6D"})
    app1_id = res.json()["application"]["id"]
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "App2 6D"})
    app2_id = res.json()["application"]["id"]
    
    # Add members to App 1
    requests.post(f"{BASE_URL}/applications/{app1_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": operator_email, "role": "OPERATOR"})
    requests.post(f"{BASE_URL}/applications/{app1_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": viewer_email, "role": "VIEWER"})
    requests.post(f"{BASE_URL}/applications/{app1_id}/users", headers={"Authorization": f"Bearer {owner_token}"}, json={"email": disabled_email, "role": "VIEWER"})
    requests.patch(f"{BASE_URL}/applications/{app1_id}/users/{dis_id}", headers={"Authorization": f"Bearer {owner_token}"}, json={"status": "DISABLED"})
    
    # 7. Test Application Login
    # Owner (ADMIN)
    res = app_login(app1_id, owner_email, "pass123")
    assert res.status_code == 200, "ADMIN failed to login"
    app_admin_token = res.json()["token"]
    
    # Operator
    res = app_login(app1_id, operator_email, "pass123")
    assert res.status_code == 200, "OPERATOR failed to login"
    app_operator_token = res.json()["token"]
    
    # Viewer
    res = app_login(app1_id, viewer_email, "pass123")
    assert res.status_code == 200, "VIEWER failed to login"
    app_viewer_token = res.json()["token"]
    print("✅ Application login valid for ADMIN, OPERATOR, VIEWER")
    
    # 11. Test Disabled User
    res = app_login(app1_id, disabled_email, "pass123")
    assert res.status_code == 403, "DISABLED user was able to login"
    print("✅ Disabled user login rejected")
    
    # 12. Test Wrong Password
    res = app_login(app1_id, owner_email, "wrongpassword")
    assert res.status_code == 401, "Wrong password allowed"
    print("✅ Wrong password rejected")
    
    # User not in application
    res = app_login(app1_id, plat_email, "pass123")
    assert res.status_code == 403, "Platform user without membership logged in"
    print("✅ User not in application rejected")
    
    # 9. /auth/me
    res = requests.get(f"{BASE_URL}/applications/{app1_id}/auth/me", headers={"Authorization": f"Bearer {app_admin_token}"})
    assert res.status_code == 200
    assert res.json()["role"] == "ADMIN"
    print("✅ Authenticated /me returns correctly")
    
    res = requests.get(f"{BASE_URL}/applications/{app1_id}/auth/me")
    assert res.status_code == 401
    print("✅ Unauthenticated /me rejected")
    
    # 13. Cross-application access / Token application mismatch
    res = requests.get(f"{BASE_URL}/applications/{app2_id}/auth/me", headers={"Authorization": f"Bearer {app_admin_token}"})
    assert res.status_code == 403, "Token from App1 used on App2 successfully"
    print("✅ Application token scope mismatch rejected (Cross-application)")
    
    # Application token accessing Platform API
    res = requests.post(f"{BASE_URL}/workspaces", headers={"Authorization": f"Bearer {app_admin_token}"}, json={"name": "Hacked WS"})
    assert res.status_code == 403, "Application token used on Platform API successfully"
    print("✅ Application token cannot access Platform APIs")
    
    # 15. Authentication Settings
    res = requests.patch(f"{BASE_URL}/applications/{app1_id}/auth/settings", headers={"Authorization": f"Bearer {app_viewer_token}"}, json={"authentication_enabled": False})
    assert res.status_code == 403, "VIEWER updated auth settings"
    
    res = requests.patch(f"{BASE_URL}/applications/{app1_id}/auth/settings", headers={"Authorization": f"Bearer {app_admin_token}"}, json={"authentication_enabled": False})
    assert res.status_code == 200, "ADMIN failed to update auth settings"
    assert res.json()["application"]["authentication_enabled"] == False
    
    # Reset
    requests.patch(f"{BASE_URL}/applications/{app1_id}/auth/settings", headers={"Authorization": f"Bearer {app_admin_token}"}, json={"authentication_enabled": True})
    print("✅ Authentication settings updated with proper authorization")
    
    # 16. Verify Phase 6C command permissions
    # Create device to test
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"name": "AppDev1", "device_type": "ESP32"})
    device1_id = res.json()["device"]["device_id"]
    requests.post(f"{BASE_URL}/applications/{app1_id}/devices", headers={"Authorization": f"Bearer {owner_token}"}, json={"device_id": device1_id})
    
    # Viewer tries command
    res = requests.post(f"{BASE_URL}/applications/{app1_id}/devices/{device1_id}/command", headers={"Authorization": f"Bearer {app_viewer_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 403, "VIEWER issued command successfully"
    
    # Operator tries command
    res = requests.post(f"{BASE_URL}/applications/{app1_id}/devices/{device1_id}/command", headers={"Authorization": f"Bearer {app_operator_token}"}, json={"command": "LED_ON"})
    assert res.status_code == 200, "OPERATOR failed to issue command"
    print("✅ Phase 6C command permissions remain intact with Application Tokens")
    
    print("\n✅ PHASE 6D INTEGRATION TESTS PASSED SUCCESSFULLY ✅")

if __name__ == "__main__":
    run_tests()
