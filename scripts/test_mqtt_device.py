import argparse
import paho.mqtt.client as mqtt
import time
import json
import random
import sys

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        userdata['connected'] = True
        client.subscribe(f"devices/{userdata['device_id']}/command")
        client.publish(f"devices/{userdata['device_id']}/status", json.dumps({
            "device_id": userdata['device_id'],
            "status": "ONLINE"
        }))
    else:
        userdata['error'] = f"Connection rejected: {reason_code}"

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
    userdata['connected'] = False
    
def on_message(client, userdata, msg):
    userdata['messages_received'] += 1

def simulate_device(broker, port, device_id, secret_key, count, interval):
    userdata = {
        'device_id': device_id,
        'connected': False,
        'messages_published': 0,
        'messages_received': 0,
        'error': None
    }
    
    # Paho MQTT v2 requires CallbackAPIVersion
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=device_id, userdata=userdata)
    client.username_pw_set(device_id, secret_key)
    
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    print(f"[{device_id}] Connecting to {broker}:{port}...")
    try:
        client.connect(broker, port, 60)
    except Exception as e:
        print(f"[{device_id}] Connection error: {e}")
        return userdata
        
    client.loop_start()
    
    # Wait for connection
    timeout = 5
    while not userdata['connected'] and timeout > 0:
        if userdata['error']:
            break
        time.sleep(1)
        timeout -= 1
        
    if not userdata['connected']:
        print(f"[{device_id}] Failed to connect: {userdata['error']}")
        client.loop_stop()
        return userdata
        
    print(f"[{device_id}] Connected. Publishing {count} messages...")
    
    start_time = time.time()
    for i in range(count):
        temp = round(random.uniform(20.0, 30.0), 2)
        hum = round(random.uniform(40.0, 70.0), 2)
        payload = json.dumps({
            "device_id": device_id,
            "data": {
                "temperature": temp,
                "humidity": hum
            }
        })
        
        info = client.publish(f"devices/{device_id}/data", payload, qos=1)
        info.wait_for_publish()
        userdata['messages_published'] += 1
        time.sleep(interval)
        
    end_time = time.time()
    userdata['latency'] = (end_time - start_time) / count if count > 0 else 0
    
    client.disconnect()
    client.loop_stop()
    return userdata

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IoT Device MQTT Simulator")
    parser.add_argument('--device-id', required=True)
    parser.add_argument('--secret-key', required=True)
    parser.add_argument('--broker', default='localhost')
    parser.add_argument('--port', type=int, default=1883)
    parser.add_argument('--count', type=int, default=10)
    parser.add_argument('--interval', type=float, default=0.5)
    
    args = parser.parse_args()
    
    result = simulate_device(
        args.broker, 
        args.port, 
        args.device_id, 
        args.secret_key, 
        args.count, 
        args.interval
    )
    
    print("--- SIMULATION RESULTS ---")
    print(f"Device: {args.device_id}")
    print(f"Connected successfully: {result['connected'] or result['messages_published'] > 0}")
    print(f"Error: {result['error']}")
    print(f"Messages published: {result['messages_published']}/{args.count}")
    print(f"Messages received: {result['messages_received']}")
    if 'latency' in result:
        print(f"Average time per cycle: {result['latency']:.3f}s")
