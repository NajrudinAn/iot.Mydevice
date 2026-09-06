# Phase 6N — Data Retention

## Overview
Data retention allows applications to configure the lifespan of their telemetry (sensor_data) records. The MyDevice platform guarantees that telemetry cleanup occurs safely, without violating the retention requirements of other tenants or applications sharing the same devices.

## Retention Options
- **7 days**: Telemetry older than 7 days is deleted.
- **30 days**: Telemetry older than 30 days is deleted.
- **Forever (0)**: Telemetry is never deleted.

**Default Behavior:**
If no retention is configured, or if a device is not assigned to any application, telemetry is kept **Forever**.

## Configuration Location
Retention is configured via the **Application Settings** page (`AdminSettings.jsx`) under the **Data Retention** card. 

## Cleanup Mechanism
A Node.js scheduled job (`backend/src/services/retentionService.js`) runs periodically (e.g., hourly) to enforce retention. 

It executes a single, atomic SQL query that computes the safest maximum retention limit for every device by joining `application_devices` to `applications`. 
Telemetry older than the calculated safe boundary is removed from `sensor_data`.

## Safe Device Sharing Behavior
If a device is shared across multiple applications, the **safest (longest)** retention period wins.
- **7 days + 30 days** = 30 days
- **7 days + Forever** = Forever
- **Unassigned Device** = Forever

## Security & Authorization
- **Tenant Isolation**: Retention cleanup strictly calculates limits per device. It never aggregates across unrelated workspaces.
- **Data Protection**: The cleanup process exclusively targets the `sensor_data` table. Users, devices, applications, dashboards, API keys, and other structural definitions are explicitly immune.
- **Endpoint Protection**: The retention configuration endpoint (`PATCH /applications/:id/retention`) enforces the `ADMIN` Application Role. Operators and Viewers cannot modify retention.

## Tests
Extensive automated regression tests (`backend/tests/dataRetention.test.js`) enforce:
- Safe intersection of limits (30 wins over 7).
- Unassigned devices defaulting to Forever.
- The preservation of related relational entities (users, devices).
- Strict bounding at EXACT hour thresholds.
- Rejection of negative or arbitrary intervals.

## Hardware Status
No physical hardware (e.g., ESP32) was utilized during the development of this feature. Telemetry generation was simulated via the existing Python and Node.js testing frameworks.

## Known Limitations
- The retention interval is statically configured on the backend server (`intervalMs`). Dynamic schedule pausing requires server restart.
- Retention is executed via a `DELETE` operation which may briefly block the `sensor_data` table on extremely heavy single-node loads, though chunking could be introduced later if TimescaleDB retention policies are not utilized.
