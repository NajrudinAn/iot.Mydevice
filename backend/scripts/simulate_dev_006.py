import paho.mqtt.client as mqtt
import json
import time
import random
import math

BROKER_HOST = "localhost"
BROKER_PORT = 1883
DEVICE_ID = "DEV-006-91E0"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")

client = mqtt.Client(client_id=f"SIM-{DEVICE_ID}-LIVE")
client.on_connect = on_connect
client.connect(BROKER_HOST, BROKER_PORT, 60)
client.loop_start()

# Base state
temperature = 22.0
humidity = 45.0
pressure = 1012.0
battery = 100.0
cpu_load = 10.0
lat = 34.0522
long = -118.2437

print(f"Starting continuous simulation for {DEVICE_ID}...")
try:
    for i in range(120): # Run for ~10 minutes (5 seconds interval * 120)
        # Random walk the values
        temperature += random.uniform(-0.5, 0.5)
        humidity += random.uniform(-1.0, 1.0)
        pressure += random.uniform(-0.2, 0.2)
        battery -= random.uniform(0.01, 0.05)
        if battery < 0: battery = 100.0
        
        cpu_load = max(0, min(100, cpu_load + random.uniform(-5.0, 5.0)))
        
        # Move coordinates slightly
        lat += random.uniform(-0.0001, 0.0001)
        long += random.uniform(-0.0001, 0.0001)

        payload = {
            "device_id": DEVICE_ID,
            "data": {
                "environment": {
                    "temperature": round(temperature, 2),
                    "humidity": round(humidity, 1),
                    "pressure": round(pressure, 1)
                },
                "system": {
                    "battery": round(battery, 2),
                    "uptime_seconds": i * 5,
                    "diagnostics": {
                        "cpu": {
                            "load_percentage": round(cpu_load, 1),
                            "temperature": round(temperature + 15, 1)
                        },
                        "memory": {
                            "used_mb": random.randint(200, 800),
                            "total_mb": 1024
                        }
                    }
                },
                "location": {
                    "coordinates": {
                        "latitude": round(lat, 6),
                        "longitude": round(long, 6)
                    },
                    "speed_kmh": round(abs(math.sin(i / 10.0)) * 60, 1)
                }
            }
        }
        
        topic = f"devices/{DEVICE_ID}/telemetry"
        client.publish(topic, json.dumps(payload))
        
        # Occasionally send an event
        if random.random() > 0.8:
            event_payload = {
                "device_id": DEVICE_ID,
                "data": {
                    "events": {
                        "motion_detected": True,
                        "light_level": random.randint(10, 1000)
                    }
                }
            }
            client.publish(topic, json.dumps(event_payload))
            
        # Occasionally send status
        if i % 12 == 0: # Every minute
            status_payload = {
                "device_id": DEVICE_ID,
                "status": "ONLINE"
            }
            client.publish(f"devices/{DEVICE_ID}/status", json.dumps(status_payload))
            
        print(f"[{i}] Sent update to {DEVICE_ID}")
        time.sleep(5)
except KeyboardInterrupt:
    print("Simulation stopped by user.")
finally:
    client.loop_stop()
    client.disconnect()
    print("Disconnected.")
