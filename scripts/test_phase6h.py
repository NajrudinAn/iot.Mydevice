import requests
import time
import sys
import uuid
import json

BASE_URL = "http://localhost:3000/api"

def print_result(name, passed, res=None):
    status = "✅ PASS" if passed else "❌ FAIL"
    details = "" if passed or res is None else f"\nDetail: {res.status_code} {res.text}"
    print(f"{status} - {name} {details}")
    if not passed:
        sys.exit(1)

def test_phase6h_api():
    print("\n--- PHASE 6H API VERIFICATION ---\n")
    session = requests.Session()
    
    # 1. Register Platform Admin
    admin_email = f"admin6h_{uuid.uuid4().hex[:6]}@test.com"
    res = session.post(f"{BASE_URL}/auth/register", json={
        "name": "Admin 6H",
        "email": admin_email,
        "password": "password123"
    })
    print_result("Platform Registration", res.status_code == 201, res)
    
    res = session.post(f"{BASE_URL}/auth/login", json={
        "email": admin_email,
        "password": "password123"
    })
    print_result("Platform Login", res.status_code == 200, res)
    admin_token = res.json()["token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Create Workspace and Application
    res = requests.post(f"{BASE_URL}/workspaces", headers=headers, json={"name": "WS 6H"})
    print_result("Workspace Creation", res.status_code == 201, res)
    workspace_id = res.json()["workspace"]["id"]
    
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", headers=headers, json={"name": "App 6H"})
    print_result("Application Creation", res.status_code == 201, res)
    app_id = res.json()["application"]["id"]
    
    # 3. Create Viewer User
    viewer_email = f"viewer6h_{uuid.uuid4().hex[:6]}@test.com"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Viewer 6H",
        "email": viewer_email,
        "password": "password123"
    })
    
    # Add Viewer to App
    viewer_id = res.json()["user"]["id"]
    res = requests.post(f"{BASE_URL}/applications/{app_id}/users", headers=headers, json={
        "email": viewer_email,
        "role": "VIEWER"
    })
    print_result("Application User (VIEWER)", res.status_code == 201, res)
    
    # Viewer Login
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": viewer_email, "password": "password123"})
    viewer_token = res.json()["token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    
    # Application Login API (which frontend calls to get App JWT)
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={"email": admin_email, "password": "password123"})
    print_result("Application Admin Login", res.status_code == 200, res)
    app_admin_token = res.json()["token"]
    app_admin_headers = {"Authorization": f"Bearer {app_admin_token}"}
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/login", json={"email": viewer_email, "password": "password123"})
    print_result("Application Viewer Login", res.status_code == 200, res)
    app_viewer_token = res.json()["token"]
    app_viewer_headers = {"Authorization": f"Bearer {app_viewer_token}"}
    
    # 4. Dashboard CRUD
    # Create Private
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", headers=app_admin_headers, json={
        "name": "Private Dash",
        "slug": f"private-{uuid.uuid4().hex[:4]}",
        "visibility": "PRIVATE"
    })
    print_result("Create Private Dashboard", res.status_code == 201, res)
    private_dash_id = res.json()["dashboard"]["id"]
    
    # Create Public
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", headers=app_admin_headers, json={
        "name": "Public Dash",
        "slug": f"public-{uuid.uuid4().hex[:4]}",
        "visibility": "PUBLIC"
    })
    print_result("Create Public Dashboard", res.status_code == 201, res)
    public_dash_id = res.json()["dashboard"]["id"]
    
    # 5. Page and Widget CRUD
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{private_dash_id}/pages", headers=app_admin_headers, json={
        "name": "Main Page",
        "slug": "main",
        "position": 1
    })
    print_result("Create Page", res.status_code == 201, res)
    page_id = res.json()["page"]["id"]
    
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards/{private_dash_id}/pages/{page_id}/widgets", headers=app_admin_headers, json={
        "title": "Temp Chart",
        "widget_type": "LINE_CHART",
        "data_source": "dev_123:temperature",
        "config": {"unit": "C"},
        "position_x": 0, "position_y": 0, "width": 4, "height": 4
    })
    print_result("Create Widget", res.status_code == 201, res)
    widget_id = res.json()["widget"]["id"]
    
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/dashboards/{private_dash_id}/pages/{page_id}/widgets/{widget_id}", headers=app_admin_headers, json={
        "position_x": 4
    })
    print_result("Update Widget (Move)", res.status_code == 200, res)
    
    # 6. View Access Rights
    # Admin Views Private
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{private_dash_id}/view", headers=app_admin_headers)
    print_result("Admin Views Private", res.status_code == 200, res)
    
    # Viewer Views Private
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{private_dash_id}/view", headers=app_viewer_headers)
    print_result("Viewer Views Private", res.status_code == 200, res)
    
    # Anonymous Views Private -> DENY
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{private_dash_id}/view")
    print_result("Anonymous Views Private (DENIED)", res.status_code in [401, 403], res)
    
    # Anonymous Views Public -> ALLOW
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards/{public_dash_id}/view")
    print_result("Anonymous Views Public (ALLOW)", res.status_code == 200, res)
    
    # Viewer cannot CREATE dashboards
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", headers=app_viewer_headers, json={
        "name": "Hacked Dash",
        "slug": f"hack-{uuid.uuid4().hex[:4]}",
        "visibility": "PUBLIC"
    })
    print_result("Viewer Dashboard Create (DENIED)", res.status_code in [401, 403], res)
    
    print("\n✅ PHASE 6H API E2E TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_phase6h_api()
