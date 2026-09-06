import requests
import json
import os
import sys
import uuid

BASE_URL = os.environ.get('API_URL', 'http://localhost:3000/api')

def log(msg):
    print(f"[*] {msg}")

def check(condition, msg, res=None):
    if not condition:
        err = res.text if res is not None else ''
        status = res.status_code if res is not None else 'None'
        print(f"[!] FAILED: {msg} - Status: {status} - {err}")
        sys.exit(1)
    print(f"[+] PASSED: {msg}")

def run():
    # 1. Register and Login to platform
    admin_email = f"admin-{uuid.uuid4().hex[:6]}@platform.com"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": admin_email,
        "password": "password123",
        "name": "Admin Test"
    })
    check(res.status_code == 201, "Platform register", res)

    res = requests.post(f"{BASE_URL}/auth/login", json={"email": admin_email, "password": "password123"})
    check(res.status_code == 200, "Platform login", res)
    token = res.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get Workspaces
    res = requests.get(f"{BASE_URL}/workspaces", headers=headers)
    check(res.status_code == 200, "Get workspaces", res)
    workspaces = res.json().get('workspaces', [])
    check(len(workspaces) > 0, "At least one workspace exists")
    workspace_id = workspaces[0]['id']
    
    # 3. Create Application
    slug = f"app-{uuid.uuid4().hex[:8]}"
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", json={
        "name": "Phase 6L E2E App",
        "slug": slug,
        "description": "App for Advanced Dashboards"
    }, headers=headers)
    check(res.status_code == 201, "Create application", res)
    app_id = res.json()['application']['id']
    
    # 4. Update Branding
    res = requests.put(f"{BASE_URL}/applications/{app_id}/branding", json={
        "display_name": "Phase 6L Display Name",
        "logo_url": "https://example.com/logo.png",
        "theme": {"primaryColor": "#ff0000"}
    }, headers=headers)
    check(res.status_code == 200, "Update application branding", res)
    app_data = res.json()['application']
    check(app_data['display_name'] == "Phase 6L Display Name", "Display name applied")
    
    # 5. Create two Devices
    devices = []
    for i in range(2):
        res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", json={
            "name": f"Device {i}",
            "device_type": "ESP32"
        }, headers=headers)
        check(res.status_code == 201, f"Create device {i}", res)
        devices.append(res.json()['device'])
        
        # Assign to application
        res = requests.post(f"{BASE_URL}/applications/{app_id}/devices", json={
            "device_id": devices[i]['id']
        }, headers=headers)
        check(res.status_code == 200, f"Assign device {i} to application", res)
        
    # 6. Create Data Source (Multi-device)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/data-sources", json={
        "name": "Multi Device Temps",
        "source_type": "DEVICE_TELEMETRY",
        "device_ids": [d['id'] for d in devices],
        "data_field": "temperature",
        "query_mode": "LATEST",
        "refresh_interval": 30
    }, headers=headers)
    check(res.status_code == 201, "Create multi-device data source", res)
    ds_id = res.json()['source']['id']
    
    # 7. Create Dashboard
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", json={
        "name": "Original Dashboard",
        "slug": "original-dashboard",
        "visibility": "PUBLIC"
    }, headers=headers)
    check(res.status_code == 201, "Create Dashboard", res)
    dashboard_id = res.json()['dashboard']['id']
    
    # 8. Create Page & Widget
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{dashboard_id}/pages", json={
        "name": "Page 1",
        "slug": "page-1",
        "position": 1
    }, headers=headers)
    check(res.status_code == 201, "Create Page", res)
    page_id = res.json()['page']['id']
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{dashboard_id}/pages/{page_id}/widgets", json={
        "title": "Temp Chart",
        "widget_type": "LINE_CHART",
        "position_x": 0,
        "position_y": 0,
        "width": 6,
        "height": 4,
        "configuration": {
            "data_source_id": ds_id
        }
    }, headers=headers)
    check(res.status_code == 201, "Create Widget", res)
    
    # 9. Duplicate Dashboard
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{dashboard_id}/duplicate", headers=headers)
    check(res.status_code == 201, "Duplicate Dashboard", res)
    dup_id = res.json()['dashboard']['id']
    
    # Activate Duplicated Dashboard
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/dashboards/{dup_id}", json={
        "status": "ACTIVE"
    }, headers=headers)
    check(res.status_code == 200, "Activate Duplicated Dashboard", res)

    # Verify Duplication
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{dup_id}/view")
    check(res.status_code == 200, "View Duplicated Dashboard", res)
    view_data = res.json()
    check(view_data['dashboard']['name'] == "Original Dashboard (Copy)", "Duplicate name correct")
    check(len(view_data['pages']) == 1, "Page duplicated")
    check(len(view_data['pages'][0]['widgets']) == 1, "Widget duplicated")
    
    # 10. Reorder Dashboards
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/dashboards/reorder", json={
        "dashboard_ids": [dup_id, dashboard_id]
    }, headers=headers)
    check(res.status_code == 200, "Reorder dashboards", res)
    
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards", headers=headers)
    dashboards = res.json()['dashboards']
    check(dashboards[0]['id'] == dup_id, "Reorder applied successfully", res)
    
    print("\n[SUCCESS] Phase 6L E2E Tests Passed")

if __name__ == "__main__":
    run()
