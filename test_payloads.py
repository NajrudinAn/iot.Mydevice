import paho.mqtt.client as mqtt
import json
import time

broker = "localhost"
client = mqtt.Client(protocol=mqtt.MQTTv311)
client.connect(broker, 1883, 60)

print("Publishing test payloads to DEV-006-91E0...")
topic = "devices/DEV-006-91E0/data"

# Test 1: Mixed Root + Nested
client.publish(topic, json.dumps({
  "air_quality": {
    "aqi": 41,
    "status": "GOOD",
    "co2_ppm": 416
  },
  "temperature_c": 28.8,
  "humidity_percent": 44.8
}))
print("Test 1 sent.")
time.sleep(2)

# Test 2: Deep Nesting + Array
client.publish(topic, json.dumps({
  "gps": {
    "coordinates": {
      "latitude": 40.67,
      "longitude": -73.98
    },
    "speed_kmh": 31.8
  },
  "events": ["motion", "alarm", "door_open"],
  "is_active": True
}))
print("Test 2 sent.")
time.sleep(2)

# Test 3: Missing Fields (Update only AQI)
client.publish(topic, json.dumps({
  "air_quality": {
    "aqi": 42
  }
}))
print("Test 3 sent.")
time.sleep(2)

# Test 4: Flat Payload
client.publish(topic, json.dumps({
  "voltage": 12.4,
  "current": 1.2
}))
print("Test 4 sent.")
time.sleep(2)

client.disconnect()
print("Done.")
