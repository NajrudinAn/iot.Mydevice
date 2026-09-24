import time
import os
import sys
import random
from dotenv import load_dotenv

# Assumes mydevice.py is in the same directory, or fallback to the one in public/sdk
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/public/sdk')))
try:
    from mydevice import MyDevice
except ImportError:
    print("Error: mydevice.py not found. Please copy it from frontend/public/sdk/mydevice.py to this folder.")
    exit(1)

load_dotenv()

BROKER = os.getenv("MYDEVICE_BROKER", "mydevice.in")
ENV_DEV_ID = os.getenv("HOME_ENV_DEVICE_ID")
ENV_DEV_SECRET = os.getenv("HOME_ENV_DEVICE_SECRET")
CTRL_DEV_ID = os.getenv("HOME_CTRL_DEVICE_ID")
CTRL_DEV_SECRET = os.getenv("HOME_CTRL_DEVICE_SECRET")

if not all([ENV_DEV_ID, ENV_DEV_SECRET, CTRL_DEV_ID, CTRL_DEV_SECRET]):
    print("Error: Missing credentials in .env file.")
    print("Please copy .env.example to .env and configure the device IDs and Secrets.")
    exit(1)

# Initialize Devices
env_device = MyDevice(ENV_DEV_ID, ENV_DEV_SECRET, broker=BROKER)
ctrl_device = MyDevice(CTRL_DEV_ID, CTRL_DEV_SECRET, broker=BROKER)

# --- 1. Environment Device Capabilities ---
env_device.add_reading("temperature", "Temperature", "number", "°C")
env_device.add_reading("humidity", "Humidity", "number", "%")
env_device.add_reading("air_quality", "Air Quality", "number", "AQI")
env_device.add_reading("light_level", "Light Level", "number", "lux")
env_device.add_reading("power_consumption", "Power", "number", "W")

# --- 2. Control Device Capabilities ---
# State variables
state = {
    "main_light": False,
    "bedroom_light": False,
    "fan": False,
    "fan_speed": 3,
    "ac": False,
    "ac_temp": 22.0,
    "door_lock": True
}

def set_main_light(val): state["main_light"] = val; print(f"[Control] Main light -> {val}")
def set_bedroom_light(val): state["bedroom_light"] = val; print(f"[Control] Bedroom light -> {val}")
def set_fan(val): state["fan"] = val; print(f"[Control] Fan -> {val}")
def set_fan_speed(val): state["fan_speed"] = val; print(f"[Control] Fan speed -> {val}")
def set_ac(val): state["ac"] = val; print(f"[Control] AC -> {val}")
def set_ac_temp(val): state["ac_temp"] = val; print(f"[Control] AC Temp -> {val}")
def set_door_lock(val): state["door_lock"] = val; print(f"[Control] Door Lock -> {'LOCKED' if val else 'UNLOCKED'}")

ctrl_device.add_switch("main_light", "Main Light", on_change=set_main_light)
ctrl_device.add_switch("bedroom_light", "Bedroom Light", on_change=set_bedroom_light)
ctrl_device.add_switch("fan", "Ceiling Fan", on_change=set_fan)
ctrl_device.add_slider("fan_speed", "Fan Speed", min_val=1, max_val=5, step=1, on_change=set_fan_speed)
ctrl_device.add_switch("ac", "Air Conditioner", on_change=set_ac)
ctrl_device.add_slider("ac_temp", "AC Temperature", min_val=16, max_val=30, step=0.5, on_change=set_ac_temp)
ctrl_device.add_switch("door_lock", "Front Door Lock", on_change=set_door_lock)

print(f"Connecting Environment Device ({ENV_DEV_ID}) to {BROKER}...")
env_device.connect(blocking=False)
print(f"Connecting Control Device ({CTRL_DEV_ID}) to {BROKER}...")
ctrl_device.connect(blocking=False)

# Wait for connections
time.sleep(2)

print("Starting simulation loop... Press Ctrl+C to stop.")
try:
    loop_count = 0
    while True:
        # Simulate realistic environment changes
        temp = 22.0 + (random.random() * 2.0 - 1.0)
        # If AC is on, temperature slowly drops towards ac_temp
        if state["ac"]:
            temp = temp - 1.5 if temp > state["ac_temp"] else temp

        hum = 45.0 + (random.random() * 5.0)
        aqi = 30 + int(random.random() * 10)
        light = 800 if state["main_light"] else 50
        
        # Calculate power
        power = 10  # base power
        if state["main_light"]: power += 15
        if state["bedroom_light"]: power += 15
        if state["fan"]: power += (20 * state["fan_speed"])
        if state["ac"]: power += 1200
        
        # Prepare Environment Data
        env_state = {
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "air_quality": aqi,
            "light_level": light,
            "power_consumption": power
        }
        
        force = (loop_count % 2 == 0)
        
        # Sync Environment State
        if force:
            for k, v in env_state.items():
                env_device.send(k, v, force_send=True)
        else:
            env_device.update_properties(env_state)
        
        # Sync control state back to platform
        # We force send every 2nd loop (10s) so new UI clients sync up immediately even if state hasn't changed.
        if force:
            for k, v in state.items():
                ctrl_device.send(k, v, force_send=True)
        else:
            ctrl_device.update_properties(state)
            
        loop_count += 1
        time.sleep(5)
except KeyboardInterrupt:
    print("Shutting down...")
    env_device.disconnect()
    ctrl_device.disconnect()
