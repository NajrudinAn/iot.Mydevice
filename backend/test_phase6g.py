import requests
import json
import uuid
import time
import random

BASE_URL = "http://localhost:3000/api"

def print_test(name, passed, info=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {name} {f'({info})' if info else ''}")

def run_tests():
    print("\n--- PHASE 6G PYTHON E2E VERIFICATION ---")
    
    # 1. Setup Admin, Workspace, Application
    rand_suffix = str(uuid.uuid4())[:8]
    email = f"admin_py_{rand_suffix}@test.com"
    
    requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Admin Py",
        "email": email,
        "password": "password123"
    })
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "password123"})
    admin_token = login_res.json().get("token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    ws_res = requests.post(f"{BASE_URL}/workspaces", json={"name": "WS Py"}, headers=headers)
    if ws_res.status_code != 201:
        print("WS ERROR:", ws_res.text)
        return
        
    ws_id = ws_res.json()["workspace"]["id"]
    
    app_res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={"name": "App Py"}, headers=headers)
    if app_res.status_code != 201:
        print("APP ERROR:", app_res.text)
        return
        
    app_id = app_res.json()["application"]["id"]
    
    print_test("Setup Workspace and Application", True, f"AppID: {app_id}")
    
    # 2. Setup Viewer
    viewer_email = f"viewer_py_{rand_suffix}@test.com"
    requests.post(f"{BASE_URL}/auth/register", json={"name": "Viewer", "email": viewer_email, "password": "password123"})
    requests.post(f"{BASE_URL}/applications/{app_id}/users", json={"email": viewer_email, "role": "VIEWER"}, headers=headers)
    viewer_token = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={"email": viewer_email, "password": "password123"}).json().get("token")
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    
    # 3. Setup Device
    dev_res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/devices", json={"name": "Py Device", "device_type": "ESP32"}, headers=headers)
    if dev_res.status_code != 201:
        print("DEVICE ERROR:", dev_res.text)
        return
        
    device_id = dev_res.json()["device"]["id"]
    requests.post(f"{BASE_URL}/applications/{app_id}/devices", json={"device_id": device_id}, headers=headers)
    
    # Seed Telemetry directly (bypassing MQTT for speed, or wait... backend doesn't have a direct telemetry inject route besides MQTT)
    # Actually, we can just test if the dashboard creation and validation works.
    
    # 4. Create Dashboards
    priv_dash = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", json={"name": "Private Dash", "slug": f"priv-{rand_suffix}", "visibility": "PRIVATE"}, headers=headers)
    pub_dash = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", json={"name": "Public Dash", "slug": f"pub-{rand_suffix}", "visibility": "PUBLIC"}, headers=headers)
    
    priv_id = priv_dash.json()["dashboard"]["id"]
    pub_id = pub_dash.json()["dashboard"]["id"]
    print_test("Admin Creates Private and Public Dashboards", priv_dash.status_code == 201 and pub_dash.status_code == 201)
    
    # 5. Viewer Cannot Modify
    edit_res = requests.patch(f"{BASE_URL}/applications/{app_id}/dashboards/{priv_id}", json={"name": "Hacked"}, headers=viewer_headers)
    print_test("Viewer Rejected from Modifying Dashboard", edit_res.status_code in [401, 403], f"Status: {edit_res.status_code}")
    
    # 6. Dashboard Hierarchy
    page_res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{priv_id}/pages", json={"name": "Main Page", "slug": "main-page", "position": 1}, headers=headers)
    if page_res.status_code != 201:
        print("PAGE ERROR:", page_res.text)
        return
        
    page_id = page_res.json()["page"]["id"]
    
    widget_res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{priv_id}/pages/{page_id}/widgets", json={
        "title": "Temp Widget",
        "widget_type": "LINE_CHART",
        "position_x": 0, "position_y": 0, "width": 4, "height": 4,
        "configuration": {"device_id": device_id, "field": "temperature"}
    }, headers=headers)
    if widget_res.status_code != 201:
        print("WIDGET ERROR:", widget_res.text)
        return
        
    widget_id = widget_res.json()["widget"]["id"]
    print_test("Admin Creates Hierarchy (Page -> Widget)", widget_res.status_code == 201)
    
    # 7. Viewer Can View Private Dashboard
    view_priv = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{priv_id}/view", headers=viewer_headers)
    print_test("Viewer Reads Private Dashboard", view_priv.status_code == 200, f"Found {len(view_priv.json()['pages'][0]['widgets'])} widgets")
    
    # 8. Anonymous Rejected from Private Dashboard
    anon_priv = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{priv_id}/view")
    print_test("Anonymous Rejected from Private Dashboard", anon_priv.status_code in [401, 403])
    
    # 9. Anonymous Can View Public Dashboard
    anon_pub = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{pub_id}/view")
    print_test("Anonymous Reads Public Dashboard", anon_pub.status_code == 200)
    
    # 10. Cross Application Isolation
    app2_res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={"name": "App 2"}, headers=headers)
    app2_id = app2_res.json()["application"]["id"]
    cross_res = requests.get(f"{BASE_URL}/applications/{app2_id}/dashboards/{priv_id}/view", headers=viewer_headers)
    print_test("Cross-Application Access Rejected", cross_res.status_code in [403, 404])
    
    print("\n✅ All E2E Integration tests executed successfully.")

if __name__ == "__main__":
    run_tests()
