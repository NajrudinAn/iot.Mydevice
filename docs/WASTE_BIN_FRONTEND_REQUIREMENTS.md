# Smart Waste Bin Frontend Requirements

To display the Smart Waste Segregation Bin data on the frontend using the MyDevice platform, you need the following setup:

## 1. Device and Application Setup (Backend)
- Register a new device in the MyDevice Dashboard (e.g., `WASTE_BIN_1`).
- Copy the generated `Device ID` and `Device Secret` and add them to the `.env` file of the simulation or actual ESP32 code.
- Create a new Hosted Application (e.g., `Smart Waste Bin Dashboard`) in your Workspace.
- Assign the device to this application so it has access to its telemetry and commands.
- Register an API route (e.g., `/api/v1/routes/waste-bin/realtime` for telemetry and `/api/v1/routes/waste-bin/command` for commands).

## 2. Frontend Connection (Server-Sent Events)
- Use standard `EventSource` (SSE) in JavaScript to connect to the backend REALTIME route:
  ```javascript
  const eventSource = new EventSource('/api/v1/routes/waste-bin/realtime?token=' + APP_TOKEN);
  eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      // Ensure you handle multiple devices by checking payload.deviceId
      const deviceId = payload.deviceId;
      const deviceData = payload.data;
      
      // Update UI for this specific deviceId
      // e.g., updateDeviceUI(deviceId, deviceData.wet_count, deviceData.distance_cm);
  };
  ```

## 3. Telemetry Fields Expected
The frontend expects the following JSON data structure from the device:
- `distance_cm` (Number): Fill level distance from the sensor.
- `wet_count` (Number): Total wet items sorted.
- `dry_count` (Number): Total dry items sorted.
- `total_count` (Number): Total items sorted.
- `servo_angle_logical` (Number): Logical angle (-45 for WET, 45 for DRY).
- `last_command` (String): "WET" or "DRY".
- `current_action` (String): e.g., "SORTING WET", "IDLE".

## 4. Commands
To send actions to the bin (e.g., manually overriding the sort or resetting counters), send an authenticated POST request to the COMMAND route. Because routes can map to multiple devices, you must specify the `target_device_id` in your command payload:
- **Sort Wet:** `{ "capability": "sort_wet", "value": true, "target_device_id": "YOUR_DEVICE_ID" }`
- **Sort Dry:** `{ "capability": "sort_dry", "value": true, "target_device_id": "YOUR_DEVICE_ID" }`
- **Reset:** `{ "capability": "reset_bin", "value": true, "target_device_id": "YOUR_DEVICE_ID" }`
