import paho.mqtt.client as mqtt
import time
import json
import argparse
import sys
import threading
import random

# Configuration
BROKER = "localhost"
PORT = 1883
TOPIC_TEMPLATE = "devices/{}/status"

def parse_args():
    parser = argparse.ArgumentParser(description="Simulate Device Status for MyDevice")
    parser.add_argument("--devices", type=int, default=3, help="Number of devices to simulate (default 3)")
    parser.add_argument("--action", choices=['start', 'stop', 'random', 'toggle'], default='start', help="Action to perform: start, stop, random, toggle")
    parser.add_argument("--device-ids", nargs='+', default=["DEV-006-91E0", "DEV-007-A5D4", "DEV-008-7191"], help="Specific device IDs to target")
    return parser.parse_args()

def publish_status(client, device_id, status):
    topic = TOPIC_TEMPLATE.format(device_id)
    payload = json.dumps({"device_id": device_id, "status": status})
    client.publish(topic, payload)
    print(f"Published to {topic}: {payload}")

def main():
    args = parse_args()
    
    client = mqtt.Client(client_id=f"MyDevice-Simulator-{random.randint(1000, 9999)}")
    try:
        client.connect(BROKER, PORT, 60)
    except Exception as e:
        print(f"Failed to connect to MQTT broker: {e}")
        sys.exit(1)
        
    client.loop_start()

    device_list = args.device_ids
    if args.devices > len(device_list):
        for i in range(len(device_list) + 1, args.devices + 1):
            device_list.append(f"DEV-SIM-{i:04d}")
    device_list = device_list[:args.devices]
    
    print(f"--- Simulating {len(device_list)} devices ---")
    
    if args.action == 'start':
        for device_id in device_list:
            publish_status(client, device_id, "ONLINE")
            time.sleep(0.1)
    elif args.action == 'stop':
        for device_id in device_list:
            publish_status(client, device_id, "OFFLINE")
            time.sleep(0.1)
    elif args.action == 'random':
        print("Running in random mode (Ctrl+C to stop)")
        try:
            while True:
                device_id = random.choice(device_list)
                status = random.choice(["ONLINE", "OFFLINE"])
                publish_status(client, device_id, status)
                time.sleep(random.uniform(1.0, 5.0))
        except KeyboardInterrupt:
            print("Stopping...")
    elif args.action == 'toggle':
        print("Running in toggle mode - Flipping every 2 seconds (Ctrl+C to stop)")
        state = "ONLINE"
        try:
            while True:
                for device_id in device_list:
                    publish_status(client, device_id, state)
                state = "OFFLINE" if state == "ONLINE" else "ONLINE"
                time.sleep(2)
        except KeyboardInterrupt:
            print("Stopping...")

    time.sleep(1) # Let the network flush
    client.loop_stop()
    client.disconnect()

if __name__ == "__main__":
    main()
