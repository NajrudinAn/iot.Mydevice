import requests, os, uuid
BASE_URL = os.getenv('API_URL', 'http://localhost:3000/api')
admin_email = f"admin6j_{uuid.uuid4()}@test.com"
admin_password = "password123"

res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": f"Admin 6J",
    "email": admin_email,
    "password": admin_password
})
print("REG:", res.json())
res = requests.post(f"{BASE_URL}/auth/login", json={"email": admin_email, "password": admin_password})
token = res.json().get('token')
headers = {"Authorization": f"Bearer {token}"}

res = requests.post(f"{BASE_URL}/workspaces", json={"name": "WS 6J"}, headers=headers)
ws_id = res.json().get('workspace').get('id')

res = requests.post(f"{BASE_URL}/workspaces/{ws_id}/applications", json={
    "name": "App 6J",
    "slug": f"app-6j-{uuid.uuid4().hex[:6]}",
    "authentication_enabled": True
}, headers=headers)
app = res.json().get('application')
app_id = app['id']

res = requests.post(f"{BASE_URL}/applications/{app_id}/auth/request-access", headers=headers)
print("APP TOKEN RESP:", res.status_code, res.text)
