# MyDevice - Smart Factory Demonstration

This example demonstrates an Industrial IoT (IIoT) setup using the MyDevice platform.

## Architecture
- **Machine 1 & 2**: Industrial CNC or milling machines tracking RPM, temperature, vibration, and power. They support stateless actions (`start`, `stop`, `reset`).
- **Factory Environment**: A controller managing the ambient temperature, humidity, main cooling fans, and emergency alarms.
- **MyDevice Platform**: Cloud infrastructure coordinating everything.
- **Demo Dashboard**: An HTML dashboard providing an operator terminal for all 3 devices.

## Simulation Physics & Logic
- **Operating Heat**: When a machine is RUNNING, its temperature rises. The factory ambient temperature also rises.
- **Anomalies**: A running machine has a random chance to encounter high vibration if it overheats. When this happens, it halts into a `WARNING` state.
- **Safety Interlock**: If any machine enters the `WARNING` state, the Factory Environment automatically trips the global `alarm`.
- **Cooling**: Turning on the Environment `cooling_fan` via the dashboard accelerates the cooldown rate of both the machines and the ambient air.

## Setup & Installation

### 1. Register Devices on the Platform
1. In your MyDevice dashboard, create three devices:
   - "Machine 1"
   - "Machine 2"
   - "Factory Environment"
2. Copy their IDs and Secrets.

### 2. Configure the Simulator
```bash
cd examples/smart-factory
cp .env.example .env
```
Edit `.env` and paste your Device IDs and Secrets.

### 3. Run the Simulator
```bash
pip install paho-mqtt python-dotenv
python run_factory.py
```

### 4. Run the Demonstration Dashboard
Open `app/index.html` in your browser. Enter your MyDevice API Token and the Device IDs. 

Press **Start** on Machine 1, and watch the RPM increase, power draw spike, and temperature rise. Wait for it to potentially trigger a fault, or turn on the Cooling Fan to manage the thermal load.
