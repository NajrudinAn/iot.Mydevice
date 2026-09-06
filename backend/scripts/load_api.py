import requests
import time
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

API_URL = "http://localhost:3000/api"
NUM_USERS = 10
REQUESTS_PER_USER = 20

results = {
    'total_requests': 0,
    'success': 0,
    'failed': 0,
    'total_latency': 0.0
}

def simulate_api_user(user_index):
    # 1. Register a temporary user
    email = f"loaduser_{uuid.uuid4().hex[:8]}@test.com"
    password = "password123"
    
    try:
        reg_res = requests.post(f"{API_URL}/auth/register", json={
            "name": f"Load User {user_index}",
            "email": email,
            "password": password
        })
        
        if reg_res.status_code != 201:
            logging.error(f"[{user_index}] Registration failed: {reg_res.text}")
            return
            
        # 2. Login to get token
        login_res = requests.post(f"{API_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        token = login_res.json().get('token')
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # 3. Hit the API repeatedly (simulate querying workspaces/applications)
        for i in range(REQUESTS_PER_USER):
            start = time.time()
            res = requests.get(f"{API_URL}/workspaces", headers=headers)
            latency = time.time() - start
            
            results['total_requests'] += 1
            results['total_latency'] += latency
            
            if res.status_code == 200:
                results['success'] += 1
            else:
                results['failed'] += 1
                
    except Exception as e:
        logging.error(f"[{user_index}] User simulation error: {e}")

def run_api_load():
    logging.info(f"Initiating API load test with {NUM_USERS} concurrent users, {REQUESTS_PER_USER} reqs each...")
    
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=NUM_USERS) as executor:
        for i in range(NUM_USERS):
            executor.submit(simulate_api_user, i)
            
    elapsed = time.time() - start_time
    avg_latency = (results['total_latency'] / results['total_requests']) if results['total_requests'] > 0 else 0
    
    logging.info("\n--- API LOAD RESULTS ---")
    logging.info(f"Total time:       {elapsed:.3f}s")
    logging.info(f"Target Reqs:      {NUM_USERS * REQUESTS_PER_USER}")
    logging.info(f"Total Handled:    {results['total_requests']}")
    logging.info(f"Successful (200): {results['success']}")
    logging.info(f"Failed:           {results['failed']}")
    logging.info(f"Avg Latency:      {avg_latency:.4f}s")

if __name__ == "__main__":
    run_api_load()
