# MyDevice Security & Isolation Model

MyDevice uses a multi-layered security model to ensure that devices, human users, and external applications can interact with the platform safely without leaking data across boundaries.

## 1. Authentication Layers

MyDevice handles authentication differently depending on the type of client connecting.

### A. Human Users (JWT)
When a user logs into the MyDevice dashboard (or a custom frontend), they authenticate via their email and password against a specific **Application**. 
- The backend verifies the credentials and issues a **JSON Web Token (JWT)**.
- The JWT contains the user's ID and the Application ID they are authenticated against.
- The JWT is signed with `JWT_SECRET`.
- **Boundary**: A human user token is strictly limited to the application it was issued for. It cannot be used to access data in a different application, even if the user exists in both.

### B. External Applications (API Keys)
When an external system (like a third-party server or a mobile app) needs to pull data without a human user, it uses an **API Key**.
- API Keys are generated in the MyDevice dashboard and tied to a specific Application.
- The raw key is shown only once. The backend stores a cryptographic hash (`key_hash`).
- **Boundary**: API keys are mapped directly to an application's scope. They can be restricted to "Read-Only" or "Command" permissions.

### C. IoT Devices (MQTT Auth)
IoT devices do not use JWTs or API keys. They use standard MQTT Username/Password authentication.
- **Username**: The physical `Device ID` (e.g., `DEV-123`).
- **Password**: The device's `Secret Key`.
- The Mosquitto MQTT broker forwards these credentials to the Node.js backend's `/api/mqtt/auth` endpoint.
- The backend verifies the credentials against the `devices` table in PostgreSQL.
- **Boundary**: A device can only publish data to its own topic (`devices/DEV-123/data`). It cannot spoof telemetry for another device.

---

## 2. Multi-Tenant Authorization Boundaries

### Workspaces
The highest level of isolation is the **Workspace**. 
- A Workspace owns Applications and Devices. 
- **Rule**: A user in Workspace A cannot see, access, or command any devices or applications in Workspace B. There is absolute tenant separation at the Workspace level.

### Applications & Devices
Inside a Workspace, you can have multiple Applications and multiple Devices.
- **Rule**: By default, Applications cannot see Devices in the same workspace. 
- An Admin must explicitly map a Device to an Application.
- A Device can be shared across multiple Applications in the same Workspace.
- Application-specific data retention policies apply strictly to the Application's view of the data. (If App A retains for 7 days, and App B retains forever, the data is retained forever for App B, but hidden after 7 days in App A).

---

## 3. Application User Roles

Within an Application, human users are assigned one of three roles, dictating their specific permissions:

1. **ADMIN**: Full control. Can manage application settings, generate API keys, manage other users, and view/command all devices mapped to the application.
2. **OPERATOR**: Standard usage. Can view dashboards and send commands to devices. Cannot manage settings or users.
3. **VIEWER**: Read-only access. Can view dashboards and telemetry. **Cannot** send commands to devices.

---

## 4. Protected API Design

To enforce this model, the MyDevice Node.js backend relies heavily on middleware:

- `authMiddleware.js`: Validates the JWT and ensures the token belongs to the requested Application.
- `apiMiddleware.js`: Validates `x-api-key` headers for headless access.
- `permissionMiddleware.js`: Asserts the user has the required Role (`ADMIN`/`OPERATOR`) before allowing destructive actions or device commands.
