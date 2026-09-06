import paho.mqtt.client as mqtt
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
MESSAGES_PER_DEVICE = 10
PUBLISH_DELAY = 0.1  # 100ms between publishes for a device

results = {
    'total_published': 0,
    'failed_publish': 0
}

def simulate_device(device_id):
    client = mqtt.Client(client_id=device_id)
    client.username_pw_set('backend_admin', 'super_secret_backend')
    
    try:
        client.connect(BROKER_HOST, BROKER_PORT, 60)
        client.loop_start()
        
        for i in range(MESSAGES_PER_DEVICE):
            topic = f"devices/{device_id}/data"
            payload = json.dumps({
                "temperature": 20 + i,
                "humidity": 40 + i,
                "msg_id": i
            })
            
            info = client.publish(topic, payload, qos=1)
            info.wait_for_publish()
            
            if info.is_published():
                results['total_published'] += 1
            else:
                results['failed_publish'] += 1
                
            time.sleep(PUBLISH_DELAY)
            
        client.loop_stop()
        client.disconnect()
        logging.info(f"[{device_id}] Completed sending {MESSAGES_PER_DEVICE} messages")
    except Exception as e:
        logging.error(f"[{device_id}] Failed: {e}")

def run_telemetry():
    logging.info(f"Initiating telemetry concurrency load with {NUM_DEVICES} devices, {MESSAGES_PER_DEVICE} msgs each...")
    device_ids = [f"DEV-TEL-{uuid.uuid4().hex[:6].upper()}" for _ in range(NUM_DEVICES)]
    
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=NUM_DEVICES) as executor:
        for d in device_ids:
            executor.submit(simulate_device, d)
            
    elapsed = time.time() - start_time
    logging.info("\n--- TELEMETRY RESULTS ---")
    logging.info(f"Total time:       {elapsed:.3f}s")
    logging.info(f"Target Msgs:      {NUM_DEVICES * MESSAGES_PER_DEVICE}")
    logging.info(f"Total Published:  {results['total_published']}")
    logging.info(f"Failed Publish:   {results['failed_publish']}")

if __name__ == "__main__":
    run_telemetry()
