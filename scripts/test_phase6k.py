import requests
import time

BASE_URL = 'http://localhost:3000/api'

def run_tests():
    print("Starting Phase 6K E2E Tests...")
    
    # 1. Register Platform Admin
    email = f"admin_{int(time.time())}@test.com"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": "password",
        "name": "Test Admin"
    })
    
    # Wait, the app doesn't log in automatically.
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": "password"
    })
    token = res.json().get('token')
    if not token:
        print("Failed to get token!")
        return
    headers = {'Authorization': f'Bearer {token}'}
    
    # 2. Create Workspace
    res = requests.post(f"{BASE_URL}/workspaces", headers=headers, json={
        "name": "Phase 6K Workspace",
        "slug": f"p6k-{int(time.time())}"
    })
    workspace_id = res.json()['workspace']['id']
    
    # 3. Create Device
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/devices", headers=headers, json={
        "name": "Sensor Unit",
        "device_type": "ESP32",
        "workspace_id": workspace_id
    })
    if 'device' not in res.json():
        print("Device creation failed:", res.json())
        return
    dev_db_id = res.json()['device']['id']
    device_id = res.json()['device']['device_id']
    
    # 4. Create App
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers=headers, json={
        "name": "P6K App",
        "workspace_id": workspace_id,
        "slug": f"p6k-app-{int(time.time())}"
    })
    try:
        app_id = res.json()['application']['id']
    except Exception as e:
        print("App creation failed:", res.text)
        return
    
    # 5. Assign Device to App
    res = requests.post(f"{BASE_URL}/applications/{app_id}/devices", headers=headers, json={
        "device_id": device_id
    })
    print("Device Assignment:", res.json())
    
    # 6. Login to App
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={
        "email": email,
        "password": "password"
    })
    app_token = res.json().get('token')
    app_headers = {'Authorization': f'Bearer {app_token}'}
    
    # 7. Create Data Source
    print("Creating Data Source...")
    res = requests.post(f"{BASE_URL}/applications/{app_id}/data-sources", headers=app_headers, json={
        "name": "Temp Source",
        "source_type": "DEVICE_TELEMETRY",
        "device_id": dev_db_id,
        "data_field": "temperature",
        "query_mode": "LATEST",
        "refresh_interval": 30
    })
    print(res.json())
    ds_id = res.json()['source']['id']
    
    # 8. Create Dashboard
    print("Creating Dashboard...")
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", headers=app_headers, json={
        "name": "Monitoring",
        "slug": f"mon-{int(time.time())}",
        "visibility": "PRIVATE"
    })
    dash_id = res.json()['dashboard']['id']
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{dash_id}/pages", headers=app_headers, json={
        "name": "Home",
        "slug": "home"
    })
    page_id = res.json()['page']['id']
    
    # 9. Create Widget
    print("Creating Widget...")
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{dash_id}/pages/{page_id}/widgets", headers=app_headers, json={
        "title": "Temperature",
        "widget_type": "SENSOR_VALUE",
        "configuration": {
            "data_source_id": ds_id
        }
    })
    print(res.json())
    widget_id = res.json()['widget']['id']
    
    # 10. Test /data endpoint
    print("Fetching Dashboard Data...")
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{dash_id}/data", headers=app_headers)
    data = res.json()
    print("Result:", data)
    
    if data.get('dashboard_id') == dash_id and widget_id in data.get('widgets', {}):
        print("✅ Phase 6K E2E test passed!")
    else:
        print("❌ Test failed!")
        
run_tests()
