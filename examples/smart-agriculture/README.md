# MyDevice - Smart Agriculture Demonstration

This example demonstrates a multi-device Smart Farm integration using the MyDevice platform.

## Architecture
- **Soil Sensor**: Monitors ground conditions (moisture, temperature, conductivity).
- **Weather Station**: Monitors atmospheric conditions (air temp, humidity, rainfall).
- **Irrigation Controller**: Actuates the main water pump and zonal valves.
- **MyDevice Platform**: The central MQTT broker and API backend.
- **Demo Dashboard**: A unified HTML/JS dashboard tying all three devices together logically.

## Simulation Interactions
The Python simulator models real-world physics:
1. When it rains (random chance in the simulation), the Soil Moisture automatically increases.
2. If you turn on the **Pump** and **Valve Zone 1**, the Water Flow increases and the Soil Moisture rises.
3. Over time, higher air temperatures slowly dry out the soil.

## Setup & Installation

### 1. Register Devices on the Platform
1. Log into your MyDevice dashboard.
2. Go to **Devices** and click **Add Device** three times, naming them:
   - "Farm Soil Sensor"
   - "Farm Weather Station"
   - "Farm Irrigation Controller"
3. Copy all three IDs and Secret Keys.

### 2. Configure the Simulator
```bash
cd examples/smart-agriculture
cp .env.example .env
```
Edit `.env` and paste your Device IDs and Secrets.

### 3. Run the Simulator
```bash
pip install paho-mqtt python-dotenv
python run_farm.py
```

### 4. Run the Demonstration Dashboard
Open `app/index.html` in your browser. Enter your MyDevice API Token and the three Device IDs.

When you turn on the pump and open Valve Zone 1 in the dashboard, the API sends commands to the Python Simulator. The simulator receives them via MQTT, actuates the digital valves, recalculates the soil moisture/flow physics, and instantly pushes the new telemetry back up to the dashboard.
