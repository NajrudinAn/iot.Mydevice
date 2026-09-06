import requests
import json
import time
import sys
import uuid

BASE_URL = "http://localhost:3000/api"

def print_step(msg):
    print(f"\n\033[94m==> {msg}\033[0m")

def print_success(msg):
    print(f"\033[92m[PASS] {msg}\033[0m")

def print_error(msg):
    print(f"\033[91m[FAIL] {msg}\033[0m")
    sys.exit(1)

def run_tests():
    print_step("PHASE 6I - APPLICATION MANAGEMENT & USER ONBOARDING TESTS")

    # 1. Create a platform admin user
    unique_id = str(uuid.uuid4())[:8]
    email = f"platform_admin_{unique_id}@example.com"
    password = "password123"

    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Platform Admin",
        "email": email,
        "password": password
    })
    if res.status_code != 201:
        print_error(f"Failed to create platform admin: {res.text}")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print_success("Created platform admin")

    # 2. Create workspace
    res = requests.post(f"{BASE_URL}/workspaces", json={
        "name": f"Workspace {unique_id}"
    }, headers=headers)
    workspace_id = res.json()["workspace"]["id"]
    print_success("Created workspace")

    # 3. Create Application
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", json={
        "name": f"App {unique_id}",
        "description": "Test App"
    }, headers=headers)
    app = res.json()["application"]
    app_id = app["id"]
    app_slug = app["slug"]
    print_success(f"Created application: {app_slug}")

    # 4. Configure Application Auth Settings
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/auth/settings", json={
        "authentication_enabled": True,
        "registration_enabled": True,
        "approval_required": True
    }, headers=headers)
    if res.status_code != 200:
        print_error("Failed to update app settings")
    print_success("Enabled auth, registration, and approval_required")

    # 5. Public slug resolver
    res = requests.get(f"{BASE_URL}/applications/slug/{app_slug}")
    if res.status_code != 200:
        print_error(f"Failed to resolve application slug: {res.text}")
    resolved_app = res.json()["application"]
    if resolved_app["id"] != app_id:
        print_error("Slug resolved to wrong application")
    if "api_keys" in json.dumps(resolved_app):
        print_error("Slug resolver leaked sensitive info")
    print_success("Application slug resolver works securely")

    # 6. Public Registration - Case A: New Email
    new_email = f"new_user_{unique_id}@example.com"
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/register", json={
        "name": "New User",
        "email": new_email,
        "password": "password123"
    })
    if res.status_code != 201:
        print_error(f"Failed Case A registration: {res.text}")
    print_success("Case A Registration successful (New email)")

    # 7. Check pending status prevents login
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": new_email,
        "password": "password123"
    })
    if res.status_code != 403 or "pending" not in res.json()["message"].lower():
        print_error(f"Pending user allowed to login or wrong message: {res.text}")
    print_success("Pending user correctly denied login")

    # 8. Admin approves user
    # First get users list
    res = requests.get(f"{BASE_URL}/applications/{app_id}/users", headers=headers)
    users = res.json()["users"]
    new_user_id = next(u["id"] for u in users if u["email"] == new_email)
    
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/users/{new_user_id}", json={
        "status": "ACTIVE"
    }, headers=headers)
    if res.status_code != 200:
        print_error("Admin failed to approve user")
    print_success("Admin approved pending user")

    # 9. Active user logs in successfully
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": new_email,
        "password": "password123"
    })
    if res.status_code != 200:
        print_error("Approved user failed to login")
    print_success("Approved user logged in successfully")

    # 10. Public Registration - Case B: Existing Email
    # Try to register with the platform admin email
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/register", json={
        "name": "Hacker",
        "email": email,
        "password": "hackerpassword"
    })
    if res.status_code != 409 or res.json().get("code") != "ACCOUNT_EXISTS":
        print_error(f"Failed to handle Case B registration correctly: {res.text}")
    print_success("Case B Registration correctly returned ACCOUNT_EXISTS")

    # 11. Request Access (Using Platform JWT)
    # The platform admin is already an ADMIN, let's create a NEW platform user first
    existing_user_email = f"existing_user_{unique_id}@example.com"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Existing Platform User",
        "email": existing_user_email,
        "password": "password123"
    })
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": existing_user_email, "password": "password123"})
    existing_user_token = res.json()["token"]

    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/request-access", headers={
        "Authorization": f"Bearer {existing_user_token}"
    })
    if res.status_code != 201:
        print_error(f"Failed to request access: {res.text}")
    print_success("Requested access successfully using Platform JWT")

    # Verify they are pending
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": existing_user_email,
        "password": "password123"
    })
    if res.status_code != 403:
        print_error("Requested access user not placed in pending state")
    print_success("Requested access user is pending")

    # 12. Disable User
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/users/{new_user_id}", json={
        "status": "DISABLED"
    }, headers=headers)
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": new_email,
        "password": "password123"
    })
    if res.status_code != 403 or "disabled" not in res.json()["message"].lower():
        print_error("Disabled user was allowed to login")
    print_success("Disabled user correctly denied login")

    print_step("ALL PHASE 6I TESTS PASSED")

if __name__ == "__main__":
    run_tests()
