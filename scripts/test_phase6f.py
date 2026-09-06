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
    return res_login.json()["token"]

def run_tests():
    print("--- Starting Phase 6F Python Integration Test ---")
    
    # 1. Admin creates workspace and application
    admin_email = f"admin_6f_{uuid.uuid4().hex[:6]}@test.com"
    admin_token = register_user("Admin 6F", admin_email, "pass123")
    
    res = requests.post(f"{BASE_URL}/workspaces", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "WS 6F"})
    workspace_id = res.json()["workspace"]["id"]
    
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "App 6F"})
    app_id = res.json()["application"]["id"]
    
    # 2. Add devices
    dev_a = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "Dev A", "device_type": "ESP32"}).json()["device"]["id"]
    dev_b = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "Dev B", "device_type": "ESP32"}).json()["device"]["id"]
    dev_c = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "Dev C", "device_type": "ESP32"}).json()["device"]["id"]
    
    requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers={"Authorization": f"Bearer {admin_token}"}, json={"device_id": dev_a})
    requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers={"Authorization": f"Bearer {admin_token}"}, json={"device_id": dev_b})
    # dev_c remains unassigned to application
    
    # 3. Create Authenticated API
    res = requests.post(f"{BASE_URL}/applications/{app_id}/apis", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "name": "Auth API",
        "slug": "auth-api",
        "authentication_required": True
    })
    api_id = res.json()["api"]["id"]
    
    # 4. Configure API Devices (Only Dev A)
    requests.post(f"{BASE_URL}/applications/{app_id}/apis/{api_id}/devices/{dev_a}", headers={"Authorization": f"Bearer {admin_token}"})
    
    # Attempt assigning unassigned dev_c (should fail)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/apis/{api_id}/devices/{dev_c}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 403, "Assigned unassigned device to API"
    
    # 5. Configure Fields
    requests.patch(f"{BASE_URL}/applications/{app_id}/apis/{api_id}/fields", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "fields": ["device_id", "temperature", "recorded_at"]
    })
    
    # 6. Generate API Key
    res = requests.post(f"{BASE_URL}/applications/{app_id}/apis/{api_id}/keys", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "Test Key"})
    raw_api_key = res.json()["raw_api_key"]
    key_id = res.json()["key_record"]["id"]
    
    # 7. External Client Simulation
    # Just relying on HTTP for GET, we don't strictly need to insert row if we just check 200 OK.
    
    # Valid Request
    res = requests.get(f"http://localhost:3000/api/v1/applications/{app_id}/public-api/auth-api", headers={"X-API-Key": raw_api_key})
    assert res.status_code == 200, f"Valid API key failed: {res.text}"
    print("✅ Valid authenticated API access works")
    
    # Invalid Key
    res = requests.get(f"http://localhost:3000/api/v1/applications/{app_id}/public-api/auth-api", headers={"X-API-Key": "invalid_key"})
    assert res.status_code == 401, "Invalid API key accepted"
    print("✅ Invalid API key blocked")
    
    # Unassigned Device Filter
    res = requests.get(f"http://localhost:3000/api/v1/applications/{app_id}/public-api/auth-api?device_id={dev_b}", headers={"X-API-Key": raw_api_key})
    assert res.status_code == 403, "Allowed querying device not assigned to API"
    print("✅ API Device scope filter works")
    
    # Revoke Key
    requests.delete(f"{BASE_URL}/applications/{app_id}/apis/{api_id}/keys/{key_id}", headers={"Authorization": f"Bearer {admin_token}"})
    res = requests.get(f"http://localhost:3000/api/v1/applications/{app_id}/public-api/auth-api", headers={"X-API-Key": raw_api_key})
    assert res.status_code == 401, "Revoked key still worked"
    print("✅ API Key revocation immediately effective")
    
    # 8. Public API Simulation
    res = requests.post(f"{BASE_URL}/applications/{app_id}/apis", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "name": "Public API",
        "slug": "public-api",
        "authentication_required": False
    })
    pub_api_id = res.json()["api"]["id"]
    requests.post(f"{BASE_URL}/applications/{app_id}/apis/{pub_api_id}/devices/{dev_a}", headers={"Authorization": f"Bearer {admin_token}"})
    
    res = requests.get(f"http://localhost:3000/api/v1/applications/{app_id}/public-api/public-api")
    assert res.status_code == 200, "Public API failed without key"
    print("✅ Public API accessible without token")

    print("\n✅ PHASE 6F PYTHON E2E TESTS PASSED SUCCESSFULLY ✅")

if __name__ == "__main__":
    run_tests()
