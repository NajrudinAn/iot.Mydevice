# Device Flow

## FIRST BOOT:

ESP32
 ↓
Wi-Fi available?
 ├── YES → Normal operation
 └── NO → AP configuration
             ↓
          Save Wi-Fi
             ↓
          Restart
             ↓
        Normal operation

## Initialization & Telemetry Flow
1. **Device registration** (User adds device in Dashboard).
2. **Device ID + Secret Key** (Platform generates credentials).
3. **Connector configuration** (Developer hardcodes/configures credentials into ESP32 code).
4. **Wi-Fi** (ESP32 connects to local network).
5. **MQTT** (ESP32 connects to Broker).
6. **Authentication** (Broker validates Device ID and Secret Key via Backend).
7. **Telemetry** (ESP32 reads DHT11 and publishes to `devices/{device_id}/data`).
8. **Backend** (Subscribes to topic, receives data).
9. **Database** (Backend saves data to `sensor_data` table).
10. **Dashboard** (User views real-time and historical data).

```text
User
  |
  v
Add Device
  |
  v
Device ID + Secret Key
  |
  v
Configure Device
(Hardcode Wi-Fi + ID + Key)
  |
  v
MQTT Authentication
(Device ID + Secret Key)
  |
  +-- Valid?
      |
      +-- NO  -> Connection Rejected
      |
      +-- YES -> Topics Allowed via ACL
          |
          v
Communication
(Publish Data / Read Commands)
```

## Remote Command Flow
1. **Dashboard** (User clicks "LED ON").
2. **API** (Dashboard sends POST request to Backend).
3. **Backend** (Validates user, formats command).
4. **MQTT** (Backend publishes command to `devices/{device_id}/command`).
5. **Connector** (Receives MQTT message on ESP32).
6. **ESP32** (Connector triggers `onCommand` callback).
7. **LED** (Application code turns the physical LED ON).
