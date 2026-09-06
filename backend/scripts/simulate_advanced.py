import paho.mqtt.client as mqtt
import time
import json
import logging
import random
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

BROKER_HOST = "localhost"
BROKER_PORT = 1883

DEVICE_1 = "DEV-001-3ECF" # 5 sources
DEVICE_2 = "DEV-002-6EEF" # 10+ sources

def get_device1_payloads():
    return [
        {
            "environment": {
                "temperature": round(random.uniform(20.0, 30.0), 1),
                "humidity": random.randint(30, 60),
                "pressure": random.randint(1000, 1020)
            }
        },
        {
            "gps": {
                "latitude": round(random.uniform(12.0, 13.0), 4),
                "longitude": round(random.uniform(45.0, 46.0), 4),
                "altitude": random.randint(100, 200)
            }
        },
        {
            "motor": {
                "speed": random.randint(1400, 1500),
                "current": round(random.uniform(2.0, 3.0), 2)
            }
        },
        {
            "device_state": {
                "battery": random.randint(80, 100),
                "signal_strength": random.randint(-90, -50)
            }
        },
        {
            "events": {
                "motion": random.choice([True, False]),
                "alarm": random.choice([True, False])
            }
        },
        # Mixed payload
        {
            "environment": {
                "temperature": round(random.uniform(20.0, 30.0), 1)
            },
            "gps": {
                "latitude": round(random.uniform(12.0, 13.0), 4)
            }
        },
        # Flat payload
        {
            "temperature": round(random.uniform(20.0, 30.0), 1),
            "humidity": random.randint(30, 60)
        }
    ]

def get_device2_payloads():
    return [
        {"weather": {"wind_speed": 12.5, "rain": False, "condition": "sunny"}},
        {"location": {"zone": "A1", "floor": 3}},
        {"production": {"count": 1050, "rate": 5.2, "status": "running"}},
        {"camera": {"status": "online", "resolution": "1080p", "fps": 30}},
        {"valve": {"state": "open", "flow_rate": 45.5}},
        {"power": {"voltage": 220, "current": 10.5, "power": 2310}},
        {"vibration": {"x": 0.1, "y": 0.2, "z": 0.05, "frequency": 50}},
        {"cooling": {"fan_speed": 3000, "temp_in": 35, "temp_out": 25}},
        {"diagnostics": {"cpu": 45, "ram": 60, "disk": 80, "uptime": 36000}},
        {"maintenance": {"last_service": "2023-01-01", "next_service": "2024-01-01", "errors": 0}},
        {"firmware": {"version": "v1.2.3", "update_available": True}}
    ]

def simulate_device(device_id, payload_generator, iterations=20):
    client = mqtt.Client(client_id=f"SIM-{device_id}")
    client.username_pw_set('backend_admin', 'super_secret_backend')
    
    try:
        client.connect(BROKER_HOST, BROKER_PORT, 60)
        client.loop_start()
        
        logging.info(f"[{device_id}] Starting simulator...")
        for i in range(iterations):
            topic = f"devices/{device_id}/data"
            payloads = payload_generator()
            payload = random.choice(payloads)
            
            info = client.publish(topic, json.dumps(payload), qos=1)
            info.wait_for_publish()
            time.sleep(random.uniform(0.5, 2.0))
            
        client.loop_stop()
        client.disconnect()
        logging.info(f"[{device_id}] Completed simulator.")
    except Exception as e:
        logging.error(f"[{device_id}] Failed: {e}")

if __name__ == "__main__":
    logging.info("Starting Advanced Multi-Source Telemetry Simulator...")
    
    with ThreadPoolExecutor(max_workers=2) as executor:
        executor.submit(simulate_device, DEVICE_1, get_device1_payloads, 50)
        executor.submit(simulate_device, DEVICE_2, get_device2_payloads, 50)
