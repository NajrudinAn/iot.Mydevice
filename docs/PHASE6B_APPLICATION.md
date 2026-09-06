# Phase 6B: Application Model & Association

## Overview

Phase 6B extends the Phase 6 Workspace Architecture by introducing **Applications**.
Applications act as logical groupings of devices and a conceptual space for dashboards, API tokens, and access management.

## Database Schema

We added two new tables:

1. `applications`:
   - `id`: UUID (Primary Key)
   - `workspace_id`: UUID (Foreign Key to Workspaces)
   - `name`: VARCHAR
   - `slug`: VARCHAR (Unique per workspace)
   - `description`: TEXT

2. `application_devices`:
   - `application_id`: UUID (Foreign Key)
   - `device_id`: UUID (Foreign Key to Devices)
   - *Primary Key*: (application_id, device_id)

## API Endpoints

- **POST /api/workspaces/:workspace_id/applications**: Create a new application.
- **GET /api/workspaces/:workspace_id/applications**: List all applications in a workspace.
- **GET /api/applications/:id**: Get application details.
- **PATCH /api/applications/:id**: Update application details.
- **DELETE /api/applications/:id**: Delete an application.

- **POST /api/applications/:id/devices**: Assign a device to an application (must belong to same workspace).
- **GET /api/applications/:id/devices**: List devices assigned to this application.
- **DELETE /api/applications/:id/devices/:device_id**: Remove a device from an application.

## Security Controls

- **Workspace Boundaries:** Devices can only be assigned to applications within the same workspace. Cross-workspace assignment is rejected (403 Forbidden).
- **User Validation:** Users must own the workspace containing the application to perform CRUD or device assignment operations.
- **Idempotency:** Re-assigning a device to an application is safe (ON CONFLICT DO NOTHING). Removing a device from an application does not delete the device from the platform.

## Test Coverage
Verified strict isolation via `application.test.js`, testing standard CRUD, unauthorized access attempts, and cross-workspace assignment rejection.
