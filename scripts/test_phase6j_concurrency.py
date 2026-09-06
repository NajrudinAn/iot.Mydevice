import requests
import threading
import uuid
import time
import os

BASE_URL = os.getenv('API_URL', 'http://localhost:3000/api')
results = []

def register_admin():
    email = f"admin_{uuid.uuid4()}@test.com"
    pw = "password123"
    requests.post(f"{BASE_URL}/auth/register", json={"name": "Admin", "email": email, "password": pw})
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pw})
    return res.json().get('token')

def create_domain(app_id, token, hostname):
    res = requests.post(f"{BASE_URL}/applications/{app_id}/domains", json={
        "hostname": hostname, "type": "CUSTOM_DOMAIN"
    }, headers={"Authorization": f"Bearer {token}"})
    results.append(res.status_code)

def main():
    token = register_admin()
    headers = {"Authorization": f"Bearer {token}"}
    
    ws_res = requests.post(f"{BASE_URL}/workspaces", json={"name": "WS"}, headers=headers)
    ws_id = ws_res.json()['workspace']['id']

    appA_res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={"name": "App A", "slug": f"a{uuid.uuid4().hex[:5]}", "authentication_enabled": True}, headers=headers)
    appB_res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={"name": "App B", "slug": f"b{uuid.uuid4().hex[:5]}", "authentication_enabled": True}, headers=headers)
    
    appA_id = appA_res.json()['application']['id']
    appB_id = appB_res.json()['application']['id']

    tokenA = requests.post(f"{BASE_URL}/applications/{appA_id}/auth/login", json={"email": "a@test.com", "password": "123"}).json() # Will fail
    tokenA = requests.post(f"{BASE_URL}/applications/{appA_id}/auth/request-access", headers=headers).json() # admin is member
    
    # Wait, the admin created the apps, so they just login to app
    resA = requests.post(f"{BASE_URL}/applications/{appA_id}/auth/request-access", headers=headers) # we just use platform token? no we can't
    # Wait, platform token works for platform endpoints, application endpoints need app token if using /api/applications/...? 
    # NO! Admin domains endpoints use platform token since they are `/api/applications/:id/domains` !!
    
    test_host = f"race-{uuid.uuid4().hex[:6]}.com"
    print(f"[*] Racing {test_host} on two apps...")
    
    t1 = threading.Thread(target=create_domain, args=(appA_id, token, test_host))
    t2 = threading.Thread(target=create_domain, args=(appB_id, token, test_host))
    
    t1.start()
    t2.start()
    
    t1.join()
    t2.join()
    
    success = results.count(201)
    fails = len(results) - success
    
    print(f"[+] Successes: {success}, Failures: {fails}")
    if success == 1 and fails == 1:
        print("[+] Concurrency Race Check PASSED")
    else:
        print("[!] Concurrency Race Check FAILED")
        exit(1)

if __name__ == "__main__":
    main()
