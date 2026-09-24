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
SOIL_DEV_ID = os.getenv("FARM_SOIL_DEVICE_ID")
SOIL_DEV_SECRET = os.getenv("FARM_SOIL_DEVICE_SECRET")
WEATHER_DEV_ID = os.getenv("FARM_WEATHER_DEVICE_ID")
WEATHER_DEV_SECRET = os.getenv("FARM_WEATHER_DEVICE_SECRET")
IRR_DEV_ID = os.getenv("FARM_IRR_DEVICE_ID")
IRR_DEV_SECRET = os.getenv("FARM_IRR_DEVICE_SECRET")

if not all([SOIL_DEV_ID, SOIL_DEV_SECRET, WEATHER_DEV_ID, WEATHER_DEV_SECRET, IRR_DEV_ID, IRR_DEV_SECRET]):
    print("Error: Missing credentials in .env file.")
    exit(1)

# Initialize Devices
soil_sensor = MyDevice(SOIL_DEV_ID, SOIL_DEV_SECRET, broker=BROKER)
weather_station = MyDevice(WEATHER_DEV_ID, WEATHER_DEV_SECRET, broker=BROKER)
irrigation_ctrl = MyDevice(IRR_DEV_ID, IRR_DEV_SECRET, broker=BROKER)

# --- Capabilities ---
# Soil Sensor
soil_sensor.add_reading("soil_moisture", "Soil Moisture", "number", "%")
soil_sensor.add_reading("soil_temperature", "Soil Temp", "number", "°C")
soil_sensor.add_reading("soil_conductivity", "Conductivity", "number", "µS/cm")

# Weather Station
weather_station.add_reading("temperature", "Air Temp", "number", "°C")
weather_station.add_reading("humidity", "Air Humidity", "number", "%")
weather_station.add_reading("rainfall", "Rainfall", "number", "mm/h")
weather_station.add_reading("wind_speed", "Wind Speed", "number", "km/h")
weather_station.add_reading("light_intensity", "Light Intensity", "number", "lux")

# Irrigation Controller
irr_state = {
    "pump": False,
    "valve_zone_1": False,
    "valve_zone_2": False,
    "water_flow": 0.0
}

def set_pump(val): irr_state["pump"] = val; print(f"[Irrigation] Pump -> {val}")
def set_v1(val): irr_state["valve_zone_1"] = val; print(f"[Irrigation] Valve 1 -> {val}")
def set_v2(val): irr_state["valve_zone_2"] = val; print(f"[Irrigation] Valve 2 -> {val}")

irrigation_ctrl.add_switch("pump", "Main Water Pump", on_change=set_pump)
irrigation_ctrl.add_switch("valve_zone_1", "Zone 1 Valve", on_change=set_v1)
irrigation_ctrl.add_switch("valve_zone_2", "Zone 2 Valve", on_change=set_v2)
irrigation_ctrl.add_reading("water_flow", "Water Flow", "number", "L/min")

# Connect
print("Connecting Farm Devices...")
soil_sensor.connect(blocking=False)
weather_station.connect(blocking=False)
irrigation_ctrl.connect(blocking=False)

time.sleep(2)

# Internal simulation state
sim_soil_moisture = 40.0
sim_rainfall = 0.0
sim_air_temp = 25.0

print("Starting Farm Simulation...")
try:
    loop_count = 0
    while True:
        # 1. Weather Logic
        # Random rain showers (10% chance to start, stops gradually)
        if random.random() < 0.1:
            sim_rainfall += random.random() * 10
        else:
            sim_rainfall = max(0, sim_rainfall - 2.0)
            
        sim_air_temp += (random.random() * 2.0 - 1.0)
        
        weather_station.update_properties({
            "temperature": round(sim_air_temp, 1),
            "humidity": round(40 + (sim_rainfall * 2), 1),
            "rainfall": round(sim_rainfall, 1),
            "wind_speed": round(5 + random.random() * 10, 1),
            "light_intensity": 10000 if sim_rainfall == 0 else 2000
        })

        # 2. Irrigation Logic
        # Calculate water flow based on pump and valves
        flow = 0.0
        if irr_state["pump"]:
            if irr_state["valve_zone_1"]: flow += 15.0
            if irr_state["valve_zone_2"]: flow += 15.0
            # slight fluctuation
            if flow > 0: flow += (random.random() * 1.0 - 0.5)
            
        irr_state["water_flow"] = round(flow, 1)
        
        force = (loop_count % 2 == 0)
        if force:
            for k, v in irr_state.items():
                irrigation_ctrl.send(k, v, force_send=True)
        else:
            irrigation_ctrl.update_properties(irr_state)

        # 3. Soil Logic
        # Soil dries out naturally based on temp
        sim_soil_moisture -= (sim_air_temp / 100.0)
        
        # Rain adds moisture
        sim_soil_moisture += (sim_rainfall * 0.5)
        
        # Irrigation adds moisture (assuming sensor is in Zone 1 for this demo)
        if irr_state["pump"] and irr_state["valve_zone_1"]:
            sim_soil_moisture += 2.0
            
        sim_soil_moisture = max(0, min(100, sim_soil_moisture))

        soil_sensor.update_properties({
            "soil_moisture": round(sim_soil_moisture, 1),
            "soil_temperature": round(sim_air_temp - 2.0, 1),
            "soil_conductivity": round(sim_soil_moisture * 12, 0)
        })

        loop_count += 1
        time.sleep(5)
except KeyboardInterrupt:
    print("Shutting down...")
    soil_sensor.disconnect()
    weather_station.disconnect()
    irrigation_ctrl.disconnect()
