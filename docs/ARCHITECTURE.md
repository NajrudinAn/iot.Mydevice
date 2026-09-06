# Architecture

## Component List
1. **Layer 1: IoT Device** (ESP32/NodeMCU, DHT11/22, LED)
2. **Layer 2: Reusable Connector** (Wi-Fi, MQTT, Auth, Telemetry, Commands, Reconnection)
3. **Layer 3: Communication** (MQTT Broker)
4. **Layer 4: Backend** (Auth, Device Management, MQTT Processing, APIs, Data Processing)
5. **Layer 5: Storage** (Users, Devices, Sensor Data, Commands)
6. **Layer 6: Application** (Web Dashboard, REST API)

## Responsibilities
- **IoT Device:** Reads sensor data, toggles physical actuator.
- **Connector:** Manages connectivity and abstracts boilerplate MQTT logic.
- **MQTT Broker:** Routes messages between Backend and Connector.
- **Backend:** Serves the REST API, processes MQTT messages, enforces business logic.
- **Database:** Persists user details, device records, and telemetry/commands.
- **Dashboard (Phase 6M UI Redesign):** A comprehensive SPA acting as the unified Platform Admin console and Application Admin interface, strictly enforcing role-based layouts, dynamic component rendering, and polling for real-time telemetry (without directly opening vulnerable browser WebSockets to MQTT).

## Communication Paths & Data Flow
- **Registration/Login:** User <-> Dashboard <-> Backend <-> DB
- **Telemetry:** Device -> Connector -> MQTT Broker -> Backend -> DB
- **Command:** User -> Dashboard -> Backend -> MQTT Broker -> Connector -> Device

## Authentication Flow
- User authenticates to Backend via REST APIs.
- Device authenticates to Backend/Broker using generated Device ID and Secret Key.

### The Three Contexts

1. **Platform Context**: Uses a Platform JWT. Grants access to workspace and application management APIs based on resource ownership.
2. **Application Context**: Uses an Application JWT (added in Phase 6D). Grants access strictly scoped to a single application environment, driven by internal Application Roles (ADMIN, OPERATOR, VIEWER).
3. **External API Context**: Uses a crypto-hashed API Key (added in Phase 6F) via `X-API-Key`. Strictly limits access to explicitly configured telemetry fields and explicitly whitelisted devices via `api_definitions`.

### Device Permissions
3. **Device Permissions** (Phase 6E): Application Administrators can configure fine-grained permissions for users on a per-device basis. The Effective Permission restricts access by calculating the intersection of the user's base Role Permissions and their specific Device Permissions.

## Database Relationship Overview
- A `User` owns one or more `Workspaces`.
- A `Workspace` groups multiple `Devices` belonging to that user.
- A `Workspace` can contain multiple `Applications`.
- An `Application` can associate with multiple `Devices` within its own workspace.
- An `Application` has multiple `Application Users` with distinct roles (`ADMIN`, `OPERATOR`, `VIEWER`).
- A `Device` produces multiple `Sensor Data` records.
- A `Device` receives multiple `Commands`.
