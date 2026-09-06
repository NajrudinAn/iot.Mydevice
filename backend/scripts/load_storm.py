import paho.mqtt.client as mqtt
import threading
import time
import uuid
import json
import logging
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

BROKER_HOST = "localhost"
BROKER_PORT = 1883
NUM_DEVICES = 10
STORM_DELAY = 0.05  # 50ms delay between connections to simulate storm

# Results tracking
results = {
    'attempts': 0,
    'success': 0,
    'failed': 0
}

def connect_device(device_id):
    results['attempts'] += 1
    client = mqtt.Client(client_id=device_id)
    # Using generic valid fallback credentials if none provided by real env, 
    # since this simulates a device connecting. 
    # In a real environment, the device uses its specific device_id and secret_key.
    # We will use 'backend_admin' and 'super_secret_backend' just to verify Mosquitto load limits 
    # (since simulating 10 real devices requires inserting them into the DB first).
    client.username_pw_set('backend_admin', 'super_secret_backend')
    
    try:
        # Time the connection
        start_time = time.time()
        client.connect(BROKER_HOST, BROKER_PORT, 60)
        client.loop_start()
        
        # Wait to ensure connection stabilizes
        time.sleep(1)
        client.loop_stop()
        client.disconnect()
        
        elapsed = time.time() - start_time
        logging.info(f"[{device_id}] Connected successfully in {elapsed:.3f}s")
        results['success'] += 1
    except Exception as e:
        logging.error(f"[{device_id}] Connection failed: {e}")
        results['failed'] += 1

def run_storm():
    logging.info(f"Initiating connection storm with {NUM_DEVICES} devices...")
    device_ids = [f"DEV-STORM-{uuid.uuid4().hex[:6].upper()}" for _ in range(NUM_DEVICES)]
    
    with ThreadPoolExecutor(max_workers=NUM_DEVICES) as executor:
        for d in device_ids:
            executor.submit(connect_device, d)
            time.sleep(STORM_DELAY)
            
    logging.info("\n--- STORM RESULTS ---")
    logging.info(f"Total Attempts: {results['attempts']}")
    logging.info(f"Successful:     {results['success']}")
    logging.info(f"Failed:         {results['failed']}")

if __name__ == "__main__":
    run_storm()
