import time
import os
import sys
import random
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/public/sdk')))
try:
    from mydevice import MyDevice
except ImportError:
    print("Error: mydevice.py not found.")
    exit(1)

load_dotenv()

BROKER = os.getenv("MYDEVICE_BROKER", "mydevice.in")
M1_ID = os.getenv("FACTORY_M1_ID")
M1_SECRET = os.getenv("FACTORY_M1_SECRET")
M2_ID = os.getenv("FACTORY_M2_ID")
M2_SECRET = os.getenv("FACTORY_M2_SECRET")
ENV_ID = os.getenv("FACTORY_ENV_ID")
ENV_SECRET = os.getenv("FACTORY_ENV_SECRET")

if not all([M1_ID, M1_SECRET, M2_ID, M2_SECRET, ENV_ID, ENV_SECRET]):
    print("Error: Missing credentials in .env file.")
    exit(1)

# Initialize Devices
m1 = MyDevice(M1_ID, M1_SECRET, broker=BROKER)
m2 = MyDevice(M2_ID, M2_SECRET, broker=BROKER)
env = MyDevice(ENV_ID, ENV_SECRET, broker=BROKER)

# --- Classes for Simulation State ---
class Machine:
    def __init__(self, device, name):
        self.device = device
        self.name = name
        self.state = "STOPPED" # STOPPED, RUNNING, WARNING
        self.rpm = 0
        self.temp = 25.0
        self.vib = 0.0
        self.power = 0
        
        # Capabilities
        self.device.add_reading("operating_state", "State", "string")
        self.device.add_reading("rpm", "RPM", "number")
        self.device.add_reading("temperature", "Temperature", "number", "°C")
        self.device.add_reading("vibration", "Vibration", "number", "mm/s")
        self.device.add_reading("power_consumption", "Power", "number", "kW")
        
        self.device.add_action("start", "Start Machine", on_execute=self.start)
        self.device.add_action("stop", "Stop Machine", on_execute=self.stop)
        self.device.add_action("reset", "Reset Machine", on_execute=self.reset)

    def start(self, params):
        if self.state != "WARNING":
            self.state = "RUNNING"
            print(f"[{self.name}] Started")
            
    def stop(self, params):
        self.state = "STOPPED"
        print(f"[{self.name}] Stopped")
        
    def reset(self, params):
        self.state = "STOPPED"
        self.temp = 25.0
        print(f"[{self.name}] Reset")

    def tick(self, env_temp, cooling_on, force_send=False):
        if self.state == "RUNNING":
            self.rpm = 1500 + random.randint(-50, 50)
            self.power = 120 + random.randint(-5, 5)
            self.vib = 2.0 + random.random()
            
            # Temp rises if running
            if not cooling_on:
                self.temp += 1.5
            else:
                self.temp += 0.2 # Cools down slower if running
                
            # Random anomaly causing high vibration -> warning
            if random.random() < 0.05 and self.temp > 60:
                self.vib = 15.0 + random.random() * 5
                self.state = "WARNING"
                print(f"[{self.name}] WARNING: High vibration detected!")
                
        elif self.state == "STOPPED":
            self.rpm = 0
            self.power = 0
            self.vib = 0.0
            # Cools down to ambient
            if self.temp > env_temp:
                self.temp -= 2.0 if cooling_on else 0.5
        elif self.state == "WARNING":
            self.rpm = 0
            self.power = 5 # idle power
            # Remains in warning until reset
            if self.temp > env_temp:
                self.temp -= 2.0 if cooling_on else 0.5

        machine_state = {
            "operating_state": self.state,
            "rpm": self.rpm,
            "temperature": round(self.temp, 1),
            "vibration": round(self.vib, 2),
            "power_consumption": self.power
        }
        if force_send:
            for k, v in machine_state.items():
                self.device.send(k, v, force_send=True)
        else:
            self.device.update_properties(machine_state)


class FactoryEnv:
    def __init__(self, device):
        self.device = device
        self.temp = 28.0
        self.hum = 45.0
        self.cooling_fan = False
        self.alarm = False
        
        self.device.add_reading("temperature", "Ambient Temp", "number", "°C")
        self.device.add_reading("humidity", "Humidity", "number", "%")
        self.device.add_switch("cooling_fan", "Cooling Fan", on_change=self.set_fan)
        self.device.add_switch("alarm", "Factory Alarm", on_change=self.set_alarm)
        
    def set_fan(self, val):
        self.cooling_fan = val
        print(f"[Environment] Cooling Fan -> {val}")
        
    def set_alarm(self, val):
        self.alarm = val
        print(f"[Environment] Alarm -> {val}")
        
    def tick(self, machine_running, force_send=False):
        # Temp goes up if machines are running and fan is off
        if machine_running and not self.cooling_fan:
            self.temp += 0.5
        elif self.cooling_fan and self.temp > 22.0:
            self.temp -= 1.0
            
        self.hum = 45.0 + random.random() * 2
        
        env_state = {
            "temperature": round(self.temp, 1),
            "humidity": round(self.hum, 1),
            "cooling_fan": self.cooling_fan,
            "alarm": self.alarm
        }
        if force_send:
            for k, v in env_state.items():
                self.device.send(k, v, force_send=True)
        else:
            self.device.update_properties(env_state)

# Instantiate
machine1 = Machine(m1, "Machine 1")
machine2 = Machine(m2, "Machine 2")
factory = FactoryEnv(env)

print("Connecting Factory Devices...")
m1.connect(blocking=False)
m2.connect(blocking=False)
env.connect(blocking=False)
time.sleep(2)

print("Starting Factory Simulation...")
try:
    loop_count = 0
    while True:
        any_running = (machine1.state == "RUNNING" or machine2.state == "RUNNING")
        force = (loop_count % 2 == 0)
        
        # Process environment first
        factory.tick(machine_running=any_running, force_send=force)
        
        # Process machines
        machine1.tick(factory.temp, factory.cooling_fan, force_send=force)
        machine2.tick(factory.temp, factory.cooling_fan, force_send=force)
        
        # Auto trigger alarm if any machine hits WARNING
        if (machine1.state == "WARNING" or machine2.state == "WARNING") and not factory.alarm:
            print("[Factory] Automatically triggering alarm due to machine warning!")
            factory.set_alarm(True)
            factory.device.update_property("alarm", True)
            
        loop_count += 1
        time.sleep(5)
except KeyboardInterrupt:
    print("Shutting down...")
    m1.disconnect()
    m2.disconnect()
    env.disconnect()
