# CRITICAL PRODUCT CONTEXT — MYDEVICE DATA FLOW, DYNAMIC APIs, CUSTOM PAGE HOSTING, EXTERNAL API, AND LIVE DEVICE CONTROL

This is the intended core behavior of MyDevice.

Do NOT interpret MyDevice as only a dashboard.

MyDevice is a platform where:

IoT devices connect securely
        ↓
MyDevice receives their data
        ↓
MyDevice preserves and records the received data
        ↓
Users can inspect the complete incoming data/log
        ↓
The administrator dynamically defines APIs for selected data
        ↓
Those APIs can be consumed by:
    1. A custom application/page hosted inside MyDevice
    2. A custom frontend running anywhere
    3. An external application/backend
        ↓
The same authorization system protects access
        ↓
Commands can also travel in the reverse direction:
Application / External API
        ↓
MyDevice Backend
        ↓
MQTT
        ↓
Correct IoT Device


## 1. DEVICE CONNECTION

An IoT device connects to the Internet.

Example:

ESP32
  ↓
Wi-Fi
  ↓
Internet
  ↓
MQTT
  ↓
MyDevice

The device authenticates using its Device ID and Secret Key.

The secret is a device credential.

The server/broker must verify that the device is authorized before
accepting its device communication.

An unauthorized device must not be able to impersonate another device.

## 2. AFTER DEVICE AUTHENTICATION — RECEIVE EVERYTHING

Once the device is authenticated and connected, whatever telemetry
or data the device sends must reach the MyDevice backend.

The platform should NOT assume that only temperature and humidity
exist.

The system should be able to understand/record the actual data
received from the device.

For example, a device may send:
```json
{
    "temperature": 28.4,
    "humidity": 61,
    "soil_moisture": 43,
    "light": 720,
    "motion": true
}
```

Another device may send:
```json
{
    "voltage": 3.72,
    "current": 1.4,
    "battery": 87
}
```

Another device may send:
```json
{
    "door": "open",
    "alarm": false
}
```

The platform should preserve the received information rather than
forcing every device into one fixed sensor schema.

## 3. COMPLETE DATA RECEIVING LOG

There must be a clear way for an authorized administrator/developer
to inspect what MyDevice actually received from a device.

This is important.

The receiving/log view should make it possible to understand:

- which device sent the data
- when it was received
- the timestamp
- the data format
- the data fields/names
- the actual values
- the complete received payload where appropriate
- whether the message was telemetry/data
- relevant message/topic information
- processing/storage status where useful

The UI should make the original incoming data understandable.

For example:

Device:
    ESP32-001

Received:
    2026-09-02 14:32:21

Topic:
    devices/ESP32-001/data

Payload:
```json
{
    "temperature": 28.4,
    "humidity": 61,
    "soil_moisture": 43
}
```

The system should clearly preserve the relationship:

DEVICE → MESSAGE → TIMESTAMP → DATA

Do not hide the underlying data behind only artificial dashboard
cards.

The developer should be able to see what the platform is actually
receiving.

## 4. DATA FIELD NAMES / LABELS

Each received data field should retain its meaningful name.

Example:

temperature
humidity
soil_moisture
battery
voltage

The system should associate the value with:

- field/data name
- value
- timestamp
- device
- message/record

The frontend can display friendly labels where appropriate, but the
underlying data identity must remain clear.

For example:

temperature → 28.4 °C
humidity → 61 %
battery → 87 %

The important point is that the platform knows WHICH data is being
provided by WHICH device and WHEN.

## 5. DATA STORAGE

Received telemetry/data should be persisted so it can be accessed
historically.

Therefore there are two concepts:

LIVE DATA

The latest/current data being received from the device.

HISTORICAL DATA

Previously received and stored records.

Example:

Device ESP32-001

Latest:

temperature = 28.4
humidity = 61

Historical:

14:30 → temperature 28.1
14:31 → temperature 28.2
14:32 → temperature 28.4

The system must support both where configured/authorized.

## 6. DYNAMIC API CREATION

This is one of the most important parts of MyDevice.

APIs should be dynamically created/configured from the MyDevice
application dashboard.

The administrator should not have to write backend code every time
they want to expose a new device data API.

The dashboard should allow the administrator to define:

    Which application?
          ↓
    Which device?
          ↓
    Which data?
          ↓
    Which API?
          ↓
    What access is allowed?

Example:

Application:
    Smart Agriculture

Device:
    ESP32-Garden-01

Available data:

    temperature
    humidity
    soil_moisture
    light

Administrator creates:

API:
    garden-sensors

Allowed data:

    temperature
    humidity
    soil_moisture

The backend dynamically serves that API.

## 7. ONE DATA FIELD OR MULTIPLE DATA FIELDS

The API builder must conceptually support both:

A) ONE DATA FIELD

Example:

    GET /api/.../temperature

Returns:
```json
{
    "temperature": 28.4,
    "timestamp": "...",
    "device": "ESP32-Garden-01"
}
```

B) MULTIPLE DATA FIELDS COMBINED

Example:

    GET /api/.../environment

Returns:
```json
{
    "temperature": 28.4,
    "humidity": 61,
    "soil_moisture": 43,
    "timestamp": "...",
    "device": "ESP32-Garden-01"
}
```

The administrator decides what the API exposes.

The API does NOT automatically expose everything.

## 8. API IS MAPPED TO DEVICE + DATA

The central relationship is:

APPLICATION
    ↓
DEVICE
    ↓
DATA FIELD(S)
    ↓
API DEFINITION
    ↓
API KEY / AUTHENTICATION
    ↓
AUTHORIZED CLIENT

For example:

Smart Home
    ↓
LivingRoom-ESP32
    ↓
temperature + humidity
    ↓
environment-api
    ↓
authorized access

Another API could be:

Smart Home
    ↓
LivingRoom-ESP32
    ↓
temperature
    ↓
temperature-api

The administrator should be able to create/manage these mappings
from the application dashboard.

This dynamic mapping is a core feature.

## 9. CUSTOM APPLICATION / CUSTOM PAGE HOSTED INSIDE MYDEVICE

An application created inside MyDevice should be able to have a
custom frontend/page experience.

The idea is NOT to create a complicated website builder.

Instead, the developer should be able to create a custom page using
normal frontend technology such as:

HTML
CSS
JavaScript

The developer can design their own UI.

Example:

    index.html
    style.css
    app.js

The custom page could contain:

    Temperature: 28.4°C
    Humidity: 61%
    Soil Moisture: 43%

or a completely different UI.

The developer chooses how the data is displayed.

MyDevice provides the backend, authentication, APIs, device data,
and commands.

## 10. CUSTOM PAGE HOSTING MODEL

The custom frontend files can be uploaded/hosted as part of the
MyDevice Application.

Conceptually:

MyDevice Application
    │
    ├── Authentication
    ├── Devices
    ├── Data
    ├── APIs
    ├── API Keys
    ├── Dashboard
    │
    └── Custom Page
          ├── index.html
          ├── style.css
          └── app.js

The hosted page is simply another frontend for the same MyDevice
application/backend.

The developer should not need to create another backend just to
display their device data.

## 11. CUSTOM PAGE AUTHENTICATION

A hosted custom page must be able to authenticate with the MyDevice
application.

The intended flow is:

User opens custom application
        ↓
Application login/authentication
        ↓
MyDevice verifies user
        ↓
MyDevice returns appropriate authenticated session/token
        ↓
Custom JavaScript uses the authenticated API
        ↓
MyDevice checks authorization
        ↓
Allowed data is returned

The custom page must NOT bypass authentication.

If authentication is required, the user must authenticate first.

Only after successful authentication should protected application
APIs work.

## 12. TOKEN-BASED CUSTOM FRONTEND ACCESS

The custom frontend should be able to use the application's
authenticated API layer.

Conceptually:

Custom HTML/JS
      ↓
Application Login
      ↓
Authentication Token
      ↓
API Request
      ↓
MyDevice Authentication
      ↓
MyDevice Authorization
      ↓
Requested Data

The token must be scoped appropriately.

The frontend should not receive database credentials or device
secret keys.

Never expose:

- PostgreSQL credentials
- MQTT broker credentials
- device Secret Keys
- server secrets

inside the custom frontend.

## 13. CUSTOM FRONTEND RUNNING OUTSIDE MYDEVICE

The developer may also write the frontend on another computer.

For example:

    MyLaptop/
        index.html
        style.css
        app.js

The developer can run it locally or host it somewhere else.

That frontend can still communicate with the MyDevice backend through
the documented application APIs, provided the authentication and
authorization rules allow it.

Therefore:

LOCAL/CUSTOM FRONTEND
        ↓
MyDevice Application API
        ↓
Authentication
        ↓
Authorization
        ↓
Device Data

The physical location of the HTML/JS frontend does not change the
MyDevice backend security model.

## 14. TWO API ACCESS MODES

There are TWO important API consumption models.

### MODE A — APPLICATION USER API

Used by the custom frontend belonging to an application.

Example:

Custom Website
      ↓
User Login
      ↓
JWT / authenticated session
      ↓
Application API
      ↓
Authorized device/data access

This is for HUMAN USERS.

### MODE B — EXTERNAL APPLICATION API

Used by software outside the application/frontend environment.

Example:

Python program
      ↓
X-API-Key
      ↓
MyDevice External API
      ↓
API Definition
      ↓
Authorized device/data
      ↓
Response

This is for SOFTWARE-TO-SOFTWARE access.

These two mechanisms must not be confused.

## 15. EXTERNAL API

MyDevice must also support an external API that can be consumed by
another application.

For example:

External Python application
External Node.js backend
External website
Mobile application
Another IoT application
Another software system

The external application can use a MyDevice API key.

Example:

External Application
        ↓
X-API-Key: ********
        ↓
MyDevice
        ↓
Identify API Key
        ↓
Identify Application/API
        ↓
Check API configuration
        ↓
Check allowed devices
        ↓
Check allowed data
        ↓
Return authorized data

## 16. EXTERNAL API IS ALSO DYNAMIC

The external API should be created/configured from the MyDevice
application dashboard.

The administrator chooses:

    Application
        ↓
    Device
        ↓
    Data field(s)
        ↓
    API definition
        ↓
    API key
        ↓
    External consumer

Example:

Application:
    Smart Factory

Device:
    Machine-01

Data:
    temperature
    vibration

API:
    machine-status

External application calls:

    machine-status

and receives the configured data.

It should not automatically gain access to every device/data in
Smart Factory.

## 17. API SECURITY

The API system must be secure.

A request should conceptually pass through:

REQUEST
   ↓
AUTHENTICATION
   ↓
IDENTIFY USER OR API CLIENT
   ↓
APPLICATION
   ↓
API DEFINITION
   ↓
DEVICE AUTHORIZATION
   ↓
DATA/OPERATION AUTHORIZATION
   ↓
ALLOW / DENY

A valid API key alone must not mean unlimited access.

The API key must be associated with the configured API/application
permissions.

## 18. LIVE DATA THROUGH THE API

The external API and custom frontend should be able to retrieve the
same underlying device data being received by MyDevice.

For example:

ESP32 sends:

{
    "temperature": 28.4,
    "humidity": 61
}

MyDevice receives it.
MyDevice stores it.
MyDevice can display it internally.
The configured API can expose it.
Custom frontend can display it.
External software can consume it.

Conceptually:

                    ESP32
                      │
                      ▼
                 MQTT / MyDevice
                      │
                ┌─────┴─────┐
                │           │
             Storage      Live Data
                │           │
                └─────┬─────┘
                      │
                 MyDevice API
                ┌─────┼─────┐
                │     │     │
                ▼     ▼     ▼
            Dashboard Custom External
                       Page    App

The API must represent the same underlying authorized MyDevice data,
not a separate manually maintained copy.

## 19. LIVE / STREAMING REQUIREMENT

When the device is continuously sending telemetry, the custom
application should be able to display updated data without manually
recreating the device/backend integration.

The exact transport can be implemented using the existing platform
architecture, but conceptually:

DEVICE
  ↓
MQTT
  ↓
MYDEVICE
  ↓
LIVE DATA
  ↓
AUTHORIZED APPLICATION/API
  ↓
CUSTOM FRONTEND

The important requirement is that the data shown by the custom page
can remain synchronized with the data being received by MyDevice.

Do not create an unrelated second telemetry pipeline.

## 20. DEVICE ACTIONS / COMMANDS

The reverse direction is equally important.

MyDevice is not only read-only.

An authorized user/custom application/external API should be able
to send commands to a device.

Example:

Custom Application
       ↓
User clicks:
    LED ON
       ↓
MyDevice Authentication
       ↓
Authorization
       ↓
Command API
       ↓
MQTT
       ↓
devices/{device_id}/command
       ↓
Correct IoT Device
       ↓
LED turns ON

The same capability should work from an authorized external API.

## 21. COMMAND SECURITY

Commands must be protected more strongly than simple data reading.

The request must verify:

- authenticated user/API client
- application
- device assignment
- device permission
- command permission
- allowed operation

Example:

VIEWER:
    Can read telemetry
    Cannot send LED_ON

OPERATOR:
    Can read telemetry
    Can perform permitted commands

Unauthorized users/API clients must receive a denial.

A command must NEVER be routed to another device accidentally.

## 22. COMMAND FLOW

The complete reverse flow is:

CUSTOM APPLICATION
        │
        ▼
Authentication
        │
        ▼
Authorization
        │
        ▼
Command API
        │
        ▼
MyDevice Backend
        │
        ▼
MQTT
        │
        ▼
Correct Device Topic
        │
        ▼
IoT Device
        │
        ▼
Action

External software follows the same backend command path:

EXTERNAL APPLICATION
        │
        ▼
API KEY
        │
        ▼
External Command API
        │
        ▼
MyDevice Authorization
        │
        ▼
MQTT
        │
        ▼
Correct Device

## 23. THE CENTRAL ADMINISTRATION MODEL

The most important administrative feature is the ability to
configure:

    WHICH DEVICE
         +
    WHICH DATA
         +
    WHICH API
         +
    WHICH CLIENT
         +
    WHICH PERMISSIONS

from the MyDevice application dashboard.

For example:

Application: Smart Home

Device A:
    Living Room ESP32

Data:
    temperature
    humidity
    LED state

API 1:
    environment
    → temperature + humidity

API 2:
    temperature
    → temperature only

API 3:
    device-control
    → LED command

Then:

Custom Application
    → environment API
    → temperature API
    → device-control API

External Application
    → API key
    → only configured APIs/data/operations

Everything is controlled by MyDevice.

## 24. VERY IMPORTANT SECURITY BOUNDARY

Never expose the IoT device's Secret Key to:

- custom HTML
- JavaScript
- browser
- external application
- normal application user

Device Secret Key is for the DEVICE's MQTT authentication.

Human users use application authentication.

External software uses API keys.

These credentials must remain separate.

## 25. SIMPLE REAL-WORLD EXAMPLE

Imagine an application called:

    Smart Greenhouse

There are three devices:

    Greenhouse-01
    Greenhouse-02
    Greenhouse-03

Greenhouse-01 sends:

{
    "temperature": 27.5,
    "humidity": 64,
    "soil": 42
}

MyDevice receives and stores this.

The administrator sees the incoming data/log.

Then the administrator creates:

API:
    greenhouse-environment

Mapped to:

Device:
    Greenhouse-01

Data:

    temperature
    humidity
    soil

A custom HTML page is created:

    greenhouse.html

The page authenticates the user and calls the configured API.

The page displays:

    Temperature: 27.5°C
    Humidity: 64%
    Soil: 42%

Now an external Python application also needs the same information.

The administrator creates/provides authorized API access.

Python:

    API Key
       ↓
    greenhouse-environment
       ↓
    receives authorized data

Now the custom application needs to turn on irrigation.

The authorized application calls the permitted command API.

MyDevice:

    Command
       ↓
    Authorization
       ↓
    MQTT
       ↓
    Greenhouse-01
       ↓
    Irrigation ON

This is the intended end-to-end behavior.

## 26. FINAL PLATFORM MODEL

The complete MyDevice platform should be understood as:

                 IoT DEVICES
                      │
                Device Secret
                      │
                      ▼
                    MQTT
                      │
                      ▼
              MYDEVICE BACKEND
                      │
          ┌───────────┼───────────┐
          │           │           │
       RECEIVE      STORE       CONTROL
          │           │           │
          └───────────┼───────────┘
                      │
                APPLICATION
                      │
       ┌──────────────┼───────────────┐
       │              │               │
   Built-in       Custom Page     External API
   Dashboard      / Frontend      / Application
       │              │               │
    User Auth      User Auth       API Key
       │              │               │
       └──────────────┼───────────────┘
                      │
                Authorization
                      │
               Device/Data/
               Command Rules
                      │
                      ▼
                  MyDevice
                      │
                      ▼
                    MQTT
                      │
                      ▼
                 IoT DEVICE

## 27. THE CORE DIFFERENTIATOR

The main idea is NOT:

"MyDevice shows IoT data."

The stronger idea is:

"MyDevice receives, stores, secures, organizes, and exposes IoT
device data and commands through dynamically configured APIs, so
developers can build their own applications and frontends without
building the entire IoT backend themselves."

The developer controls the presentation.

MyDevice controls:

- device connectivity
- device authentication
- telemetry ingestion
- data storage
- application structure
- authentication
- authorization
- API configuration
- API keys
- device permissions
- command routing
- MQTT communication

## 28. DO NOT MISUNDERSTAND THIS

Do NOT implement this as:

    Device → Dashboard only

It must conceptually be:

    Device
       ↓
    MyDevice ingestion
       ↓
    Complete received data/log
       ↓
    Persistent data
       ↓
    Dynamic API definitions
       ↓
    Authorized consumers

Consumers can be:

    Built-in Dashboard
    Custom Hosted Page
    Custom Frontend Anywhere
    External Application

And the reverse path must support:

    Authorized Consumer
       ↓
    MyDevice
       ↓
    Command API
       ↓
    MQTT
       ↓
    Correct Device

This entire flow is the intended MyDevice product model.
