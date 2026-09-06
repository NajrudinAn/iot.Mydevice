# API Plan

The system will expose the following initial REST APIs:

## Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`

## Device Management
- `POST /api/devices`
- `GET /api/devices`
- `GET /api/devices/:id`
- `DELETE /api/devices/:id`

## Data Retrieval
- `GET /api/devices/:id/data`

## Command
- `POST /api/devices/:id/command`

*(These are planned APIs and will be implemented in subsequent phases.)*
