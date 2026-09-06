import requests
import os
import uuid

BASE_URL = os.getenv('API_URL', 'http://localhost:3000/api')

def log(msg):
    print(f"[*] {msg}")

def check(condition, msg):
    if not condition:
        print(f"[!] FAILED: {msg}")
        exit(1)
    print(f"[+] PASSED: {msg}")

def main():
    log("Starting Phase 6J Domain Tests")

    admin_email = f"admin6j_{uuid.uuid4()}@test.com"
    admin_password = "password123"

    # 1. Login to platform to get workspace/app context
    requests.post(f"{BASE_URL}/auth/register", json={
        "name": f"Admin 6J",
        "email": admin_email,
        "password": admin_password
    })
    
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": admin_email,
        "password": admin_password
    })
    token = res.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Workspace
    res = requests.post(f"{BASE_URL}/workspaces", json={"name": "WS 6J"}, headers=headers)
    ws_id = res.json().get('workspace').get('id')

    # 3. Create Application
    res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={
        "name": "App 6J",
        "slug": f"app-6j-{uuid.uuid4().hex[:6]}",
        "authentication_enabled": True
    }, headers=headers)
    app = res.json().get('application')
    app_id = app['id']

    # 4. Get Application JWT (Admin)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": admin_email,
        "password": admin_password
    })
    app_token = res.json().get('token')
    app_headers = {"Authorization": f"Bearer {app_token}"}

    # 5. Add Domain (Platform Subdomain)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains", json={
        "hostname": f"myapp-{uuid.uuid4().hex[:6]}.platform.local",
        "type": "PLATFORM_SUBDOMAIN"
    }, headers=app_headers)
    check(res.status_code == 201, f"Added Platform Subdomain: {res.status_code} - {res.text}")
    domain_id_platform = res.json()['domain']['id']
    check(res.json()['domain']['status'] == 'ACTIVE', "Platform subdomain is auto ACTIVE")

    # 6. Add Custom Domain
    custom_host = f"customer-{uuid.uuid4().hex[:6]}.com"
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains", json={
        "hostname": custom_host,
        "type": "CUSTOM_DOMAIN"
    }, headers=app_headers)
    check(res.status_code == 201, "Added Custom Domain")
    domain_custom = res.json()['domain']
    domain_id_custom = domain_custom['id']
    check(domain_custom['status'] == 'PENDING', "Custom domain starts PENDING")

    # 7. Duplicate Hostname Check
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains", json={
        "hostname": custom_host,
        "type": "CUSTOM_DOMAIN"
    }, headers=app_headers)
    check(res.status_code == 400, "Duplicate hostname rejected")

    # 8. Reserved Hostname Check
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains", json={
        "hostname": "www.platform.com",
        "type": "CUSTOM_DOMAIN"
    }, headers=app_headers)
    check(res.status_code == 400, "Reserved hostname rejected")

    # 9. Verify Domain
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains/{domain_id_custom}/verify", headers=app_headers)
    check(res.status_code == 200, f"Custom domain verified successfully: {res.text}")
    check(res.json()['domain']['status'] == 'ACTIVE', "Custom domain became ACTIVE after verification")

    # 10. Set Primary
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/domains/{domain_id_custom}", json={
        "is_primary": True
    }, headers=app_headers)
    check(res.status_code == 200, "Set domain as primary")
    
    # 11. Resolve Host
    res = requests.get(f"{BASE_URL}/applications/resolve-host?hostname={custom_host}")
    check(res.status_code == 200, f"Resolve host works: {res.text}")
    check(res.json()['application']['id'] == app_id, "Host resolves to correct application")
    check('verification_token' not in res.json()['application'], "Safe metadata returned only")

    # 12. Security Test - Viewer Role
    viewer_email = f"viewer_{uuid.uuid4()}@test.com"
    viewer_password = "password123"
    requests.post(f"{BASE_URL}/auth/register", json={
        "name": f"Viewer {uuid.uuid4()}",
        "email": viewer_email,
        "password": viewer_password
    })
    
    res_assign = requests.post(f"{BASE_URL}/applications/{app_id}/users", json={
        "email": viewer_email,
        "role": "VIEWER"
    }, headers=app_headers)
    
    res_v_app = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": viewer_email,
        "password": viewer_password
    })
    viewer_app_token = res_v_app.json().get('token')
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains", json={
        "hostname": f"hacked-{uuid.uuid4().hex[:6]}.com",
        "type": "CUSTOM_DOMAIN"
    }, headers={"Authorization": f"Bearer {viewer_app_token}"})
    check(res.status_code == 403, "Viewer denied domain management")

    log("Phase 6J Domain Tests Completed Successfully.")

if __name__ == "__main__":
    main()
