# MyDevice - Smart Home Demonstration

This example demonstrates a complete Smart Home integration using the MyDevice platform.

## Architecture
- **Home Environment Device**: A read-only sensor array tracking temperature, humidity, air quality, light levels, and power consumption.
- **Home Control Device**: A bidirectional controller for managing lights, ceiling fans, air conditioning, and a door lock.
- **MyDevice Platform**: The central MQTT broker and API backend (running at `mydevice.in` or `localhost`).
- **Demo Dashboard**: A standalone HTML/JS web application that connects directly to the MyDevice REST API to view and control both devices in a single, unified interface.

## Devices & Capabilities

### 1. Home Environment Device
- **Telemetry**: `temperature` (number, °C), `humidity` (number, %), `air_quality` (number, AQI), `light_level` (number, lux), `power_consumption` (number, W).

### 2. Home Control Device
- **Controls**: `main_light` (switch), `bedroom_light` (switch), `fan` (switch), `fan_speed` (slider 1-5), `ac` (switch), `ac_temp` (slider 16-30°C), `door_lock` (switch).

## Setup & Installation

### 1. Register Devices on the Platform
1. Log into your MyDevice dashboard.
2. Go to **Devices** and click **Add Device**. Name it "Home Environment" and copy the generated ID and Secret Key.
3. Click **Add Device** again. Name it "Home Control" and copy the generated ID and Secret Key.

### 2. Configure the Simulator
```bash
cd examples/smart-home
cp .env.example .env
```
Edit `.env` and paste your Device IDs and Secrets. If you are testing locally, set `MYDEVICE_BROKER=localhost`.

### 3. Run the Simulator
```bash
pip install -r requirements.txt
python run_home.py
```
You should see both devices connect and begin publishing telemetry.
- Try issuing commands from the official MyDevice dashboard to the Home Control device, and watch the Python console print the results. Notice how turning on the AC causes the simulated environment temperature to drop.

### 4. Run the Demonstration Dashboard
This folder contains a custom dashboard application (`app/index.html`) that uses the MyDevice API.

To run it, you can simply open it in your browser:
```bash
open app/index.html
# or
xdg-open app/index.html
```

Or run a local static server:
```bash
cd app
npx serve .
```

**Note:** When you open the dashboard, you will be prompted for your MyDevice API Token. You can generate a Personal Access Token in the MyDevice Developer Settings, or extract your current session JWT from your browser's Developer Tools.

## Testing Checklist
- [x] Python simulator runs and authenticates securely.
- [x] Telemetry reaches the server and is visible in the MyDevice console.
- [x] Environment values change realistically (AC drops temperature, lights increase power).
- [x] The custom HTML dashboard correctly fetches the device state via the REST API.
- [x] Sending a command from the custom dashboard updates the Python simulator immediately via MQTT.
