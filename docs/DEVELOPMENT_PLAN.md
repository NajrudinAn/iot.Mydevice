# Development Plan

*Note: Do not allow a phase to be marked COMPLETED merely because code exists. It must satisfy its explicit gate.*

## Phase 0: Planning + repository + documentation
- **Objective:** Establish scope, requirements, structure, and project guidelines.
- **Tasks:** Inspect repository, create directory structure, write root documents and docs/.
- **Expected Output:** Completed planning artifacts.
- **Completion Criteria:** All docs in place, no implementation started.
- **Dependencies:** None.
- **Gate:** Documentation and project structure complete.

## Phase 1: Backend + database
- **Objective:** Setup Node.js backend and MySQL/Postgres schema.
- **Tasks:** DB schema creation, basic API scaffolding, environment configuration.
- **Expected Output:** Working REST API capable of DB operations.
- **Completion Criteria:** Database running, basic schemas seeded, API responds to health check.
- **Dependencies:** Phase 0.
- **Gate:** Backend starts, database works, and basic user/device APIs work.

## Phase 2: MQTT communication
- **Objective:** Establish broker and backend MQTT handling.
- **Tasks:** Setup Mosquitto, integrate MQTT client in backend, handle topics.
- **Expected Output:** Backend can publish/subscribe to broker successfully.
- **Completion Criteria:** Backend logs incoming telemetry and can send command messages.
- **Dependencies:** Phase 1.
- **Gate:** Backend communicates successfully with MQTT broker.

## Phase 3: Device registration + authentication
- **Objective:** Secure devices and API.
- **Tasks:** API endpoints for device registration, ID/Key generation, device-level auth checks.
- **Expected Output:** Devices can be registered; backend rejects unauthorized MQTT connections.
- **Completion Criteria:** End-to-end simulated auth works.
- **Dependencies:** Phase 1 & 2.
- **Gate:** Valid/invalid device authentication behavior is verified.

## Phase 4: Reusable ESP32/NodeMCU connector
- **Objective:** Build the C/C++ library for devices.
- **Tasks:** Write Wi-Fi/MQTT connection logic, reconnection handling, pub/sub wrappers.
- **Expected Output:** A library folder that can be imported into Arduino IDE/PlatformIO.
- **Completion Criteria:** Library compiles without errors.
- **Dependencies:** Phase 3.
- **Gate:** Reusable connector compiles and communicates with MQTT.

## Phase 5: Physical ESP32 + DHT11/DHT22 + LED
- **Objective:** Build the physical prototype using the connector.
- **Tasks:** Wire up ESP32, include the connector, write main loop.
- **Expected Output:** Device connects, sends real DHT data, toggles LED on command.
- **Completion Criteria:** Device communicates successfully with backend.
- **Dependencies:** Phase 4.
- **Gate:** Real ESP32 sends sensor data and receives LED commands.

## Phase 6: Web dashboard
- **Objective:** Build the frontend UI.
- **Tasks:** Login page, dashboard device list, device details page, chart/table for telemetry, LED switch.
- **Expected Output:** Usable web UI.
- **Completion Criteria:** Users can interact via UI instead of Postman/curl.
- **Dependencies:** Phase 1 (for APIs).
- **Gate:** Dashboard can monitor devices and send commands.

## Phase 7: Complete integration
- **Objective:** Tie everything together.
- **Tasks:** End-to-end testing, fixing bugs, UI polish.
- **Expected Output:** Stable system.
- **Completion Criteria:** All functionalities work seamlessly together.
- **Dependencies:** All previous phases.
- **Gate:** Complete end-to-end flow works.

## Phase 8: Testing + documentation + research-paper results
- **Objective:** Finalize project deliverables.
- **Tasks:** Execute test plan, capture results, write paper content.
- **Expected Output:** Final codebase, test reports, charts for paper.
- **Completion Criteria:** All test cases executed and documented.
- **Dependencies:** Phase 7.
- **Gate:** Testing is completed and actual results are recorded.
