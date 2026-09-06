import requests
import json
import os
import sys
import uuid
import threading
import time

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

def worker(app_id, dup_id, dashboard_id, headers):
    # Try to reorder
    res = requests.patch(f"{BASE_URL}/applications/{app_id}/dashboards/reorder", json={
        "dashboard_ids": [dup_id, dashboard_id]
    }, headers=headers)
    if res.status_code != 200:
        print(f"Worker failed: {res.status_code} {res.text}")

def run():
    # 1. Register and Login to platform
    admin_email = f"admin-conc-{uuid.uuid4().hex[:6]}@platform.com"
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
    workspace_id = res.json()['workspaces'][0]['id']
    
    # 3. Create Application
    slug = f"app-{uuid.uuid4().hex[:8]}"
    res = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/applications", json={
        "name": "Phase 6L Concurrency App",
        "slug": slug,
        "description": "App for Advanced Dashboards"
    }, headers=headers)
    check(res.status_code == 201, "Create application", res)
    app_id = res.json()['application']['id']
    
    # 4. Create Dashboard 1
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", json={
        "name": "Dashboard 1",
        "slug": "dashboard-1",
        "visibility": "PUBLIC"
    }, headers=headers)
    check(res.status_code == 201, "Create Dashboard 1", res)
    d1_id = res.json()['dashboard']['id']

    # 5. Create Dashboard 2
    res = requests.post(f"{BASE_URL}/applications/{app_id}/dashboards", json={
        "name": "Dashboard 2",
        "slug": "dashboard-2",
        "visibility": "PUBLIC"
    }, headers=headers)
    check(res.status_code == 201, "Create Dashboard 2", res)
    d2_id = res.json()['dashboard']['id']

    # 6. Fire multiple concurrent reorders
    threads = []
    for _ in range(10):
        t = threading.Thread(target=worker, args=(app_id, d2_id, d1_id, headers))
        threads.append(t)
    
    print("[*] Starting 10 concurrent reorder requests...")
    for t in threads:
        t.start()
    for t in threads:
        t.join()
        
    print("[+] Concurrent reorder requests completed")
    
    res = requests.get(f"{BASE_URL}/applications/{app_id}/dashboards", headers=headers)
    dashboards = res.json()['dashboards']
    check(dashboards[0]['id'] == d2_id, "Final reorder state is consistent", res)
    check(dashboards[1]['id'] == d1_id, "Final reorder state is consistent", res)

    print("\n[SUCCESS] Phase 6L Concurrency Tests Passed")

if __name__ == "__main__":
    run()
