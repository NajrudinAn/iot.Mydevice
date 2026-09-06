import re
with open("scripts/test_phase6i.py", "r") as f:
    content = f.read()

content = content.replace(
    'res = requests.post(f"{BASE_URL}/auth/register", json={',
    'res = requests.post(f"{BASE_URL}/auth/register", json={'
)

# We need to change how the token is retrieved
# Wait, I'll just write a sed or python script to fix the test_phase6i.py directly
