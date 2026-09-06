# MyDevice Custom Frontend & Application API Guide

One of the core design goals of MyDevice is that **you do not need to build your own IoT backend just to create a custom frontend or mobile app**. MyDevice serves as a headless IoT backend that allows you to securely retrieve your telemetry, interact with devices, and manage data from external applications.

You can consume MyDevice data in two main ways:
1. **As a Human User (Application JWT)**: For standard web dashboards where users log in with an email and password.
2. **As an External Application (API Keys)**: For server-to-server integrations, mobile apps, or headless tasks.

---

## 1. Using Application JWTs (Human Users)

If you are building a custom frontend for your application, MyDevice provides dedicated Application-level Authentication endpoints. 

### Flow

1. Register/Login against the Application endpoint:
   ```http
   POST /api/applications/:applicationId/auth/login
   {
     "email": "user@my-custom-app.com",
     "password": "password123"
   }
   ```
2. You will receive a JWT specifically scoped to that Application and Workspace:
   ```json
   {
     "token": "eyJhbG...",
     "user": {
         "id": 12,
         "role": "VIEWER"
     }
   }
   ```
3. Pass this token in the `Authorization` header as `Bearer eyJhbG...` for all subsequent requests.

### Data Fetching

Your custom frontend can now request data directly from MyDevice, for example, fetching telemetry for a dashboard:

```http
GET /api/applications/:applicationId/data/latest

Headers:
Authorization: Bearer <your_jwt_token>
```

The MyDevice backend will verify the user's role (`ADMIN`, `OPERATOR`, `VIEWER`), map it to the application's associated devices, and return only the telemetry that the user is authorized to see.

---

## 2. Using API Keys (External Integrations)

For server-to-server or headless environments, use **API Keys**. API Keys are generated from the MyDevice Admin Dashboard and are explicitly tied to a specific Application.

### Generating Keys

1. Navigate to your Application in the MyDevice Dashboard.
2. Go to **Settings -> API Keys**.
3. Generate a new key (e.g., `Read-Only Frontend`).
4. **Copy the key immediately** (it will never be shown again, as the backend only stores a cryptographic hash).

### Flow

Simply pass the API Key in the `x-api-key` header for any API request directed at your Application:

```http
GET /api/applications/:applicationId/data/latest

Headers:
x-api-key: mydevice_live_abcdef1234567890
```

### Supported Dynamic APIs

MyDevice automatically maps the incoming API Key to your Application. You can then use the platform's standard REST API routes to pull data:

- **Get Latest Telemetry**: `GET /api/applications/:appId/data/latest`
- **Get Historical Data**: `GET /api/applications/:appId/data/history?hours=24`
- **List Associated Devices**: `GET /api/applications/:appId/devices`

---

## 3. Remote Commanding

If your user (or API key) has the appropriate permissions (Admin or Operator), you can send commands directly to IoT devices through the REST API. MyDevice translates this into an MQTT payload and delivers it directly to the device.

```http
POST /api/devices/:deviceId/command

Headers:
Authorization: Bearer <your_token> OR x-api-key: <your_api_key>

Body:
{
  "command": "LED_ON",
  "payload": { "brightness": 100 }
}
```

If the device is connected, the MyDevice backend publishes this payload to the device's specific MQTT command topic `devices/<deviceId>/command`.

---

## Error Handling

MyDevice APIs provide structured error responses for your custom frontend to consume:

```json
{
  "error": "Unauthorized access to device"
}
```

Standard HTTP codes apply:
- **401**: Missing or invalid Token/API Key.
- **403**: Forbidden (e.g., trying to send a command as a `VIEWER`).
- **404**: Resource not found (e.g., fetching a device not assigned to your Application).
- **500**: Internal server error.
