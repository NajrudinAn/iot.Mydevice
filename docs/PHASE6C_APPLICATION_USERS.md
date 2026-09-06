# Phase 6C: Application Users & Roles

## Overview
Phase 6C introduces a secure, multi-user permission layer within Applications. Instead of relying solely on global Workspace Ownership, users can now be assigned specific roles within an Application. This layer intercepts device actions (telemetry fetching and commands) to enforce fine-grained access control before interacting with the MQTT backend.

## Roles

1. **ADMIN**
   - Can manage application members (add, change role, remove).
   - Can view application and assigned devices.
   - Can view telemetry and execute commands.
   - Protected by a "last ADMIN" safety constraint ensuring an application is never orphaned.
2. **OPERATOR**
   - Cannot manage users.
   - Can view application, assigned devices, and telemetry.
   - Can execute permitted device commands.
3. **VIEWER**
   - Cannot manage users.
   - Cannot execute device commands.
   - Can view application, assigned devices, and telemetry.

## Database Schema
The `application_users` table manages memberships:
- `id` (UUID)
- `application_id` (UUID)
- `user_id` (UUID)
- `role` (ADMIN, OPERATOR, VIEWER)
- `status` (ACTIVE, DISABLED)

## Security Enhancements
- **Transactional Application Creation:** The Workspace Owner is automatically added as an `ADMIN` in the same database transaction as the Application creation.
- **Strict Isolation:** 
  - An Application's device operations strictly require the device to be assigned to that specific application (`application_devices`).
  - Cross-application and cross-workspace accesses are strictly prevented at the database level.
- **Middleware Integration:** A reusable middleware `requireApplicationRole(['ROLE_NAME'])` protects application routes and enforces ACTIVE status and appropriate role.

## New API Endpoints
- `POST /api/applications/:id/users` - Add existing user.
- `GET /api/applications/:id/users` - List users.
- `PATCH /api/applications/:id/users/:user_id` - Update status or role.
- `DELETE /api/applications/:id/users/:user_id` - Remove user.
- `POST /api/applications/:id/devices/:device_id/command` - Issue command to an assigned device (requires ADMIN/OPERATOR).
- `GET /api/applications/:id/devices/:device_id/data` - Fetch telemetry of an assigned device.

## Testing
- **Unit/Integration Tests (Jest):** Validates all 20+ requirements (e.g. VIEWER cannot run commands, DISABLED user is denied access, cross-application checks).
- **Python Integration Tests:** End-to-end tests ensuring API robustness.
