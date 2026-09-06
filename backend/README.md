# Backend

This directory contains the Node.js/Express application that provides REST APIs for the dashboard and handles MQTT communication with IoT devices.

## Technology
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT, bcryptjs

## Prerequisites
- Node.js installed
- Docker (Colima) running with a PostgreSQL container exposing port 5432

## Database Setup & Environment Variables
If PostgreSQL is running via Docker, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```
Ensure `DATABASE_URL` is correct. The default assumes a local postgres docker container: `postgres://postgres:postgres@localhost:5432/iot_platform`.

If the `iot_platform` database does not exist, you must create it in your postgres container.

## Installation
```bash
npm install
```

## Initialize Database Schema
This creates the `users` and `devices` tables.
```bash
npm run db:init
```

## Running Backend
```bash
npm run dev
```

## API Endpoints
- `GET /api/health`
- `POST /api/auth/register` (name, email, password)
- `POST /api/auth/login` (email, password)
- `POST /api/devices` (name, device_type) - requires Auth header
- `GET /api/devices` - requires Auth header
- `GET /api/devices/:id` - requires Auth header
- `GET /api/devices/:id` - requires Auth header
- `DELETE /api/devices/:id` - requires Auth header

*Authentication Usage:* Pass the JWT token as `Authorization: Bearer <TOKEN>` in the headers.

## MQTT Setup and Testing (Phase 2)
This backend includes an integrated MQTT client that automatically connects to an MQTT broker on startup.

### Starting Mosquitto (Docker)
Run the following from the root of the project to start a local Mosquitto broker:
```bash
mkdir -p mosquitto/config
echo -e "listener 1883\nallow_anonymous true" > mosquitto/config/mosquitto.conf
docker run -d --name mqtt_broker -p 1883:1883 -v $(pwd)/mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf eclipse-mosquitto:2
```

### Environment Variables
Ensure `.env` contains:
```env
MQTT_BROKER_URL=mqtt://localhost:1883
```

### MQTT Topics
The backend subscribes to:
- `devices/+/data` (Expects `{"device_id": "...", "data": {"temperature": 25, "humidity": 60}}`)
- `devices/+/status` (Expects `{"device_id": "...", "status": "ONLINE"}`)

The backend can publish to:
- `devices/{device_id}/command` (Payload: `{"command": "LED_ON"}`)

### Running Automated Tests
To verify all REST APIs and MQTT functionality, run:
```bash
npm test
```
