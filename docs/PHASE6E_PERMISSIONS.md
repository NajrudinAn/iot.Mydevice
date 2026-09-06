# Phase 6E: Advanced Device, Data & Command Permissions

## Overview
Phase 6E extends the application-level Role-Based Access Control (RBAC) established in Phase 6C with granular, per-user, per-device permissions. This enables Application Administrators to precisely control exactly which devices application members can interact with, without having to assign complex global roles.

## Architecture

The system resolves authorization using an intersection algorithm between maximum role privileges and specific device permissions.

### Authorization Flow
1. **Authentication:** Valid Platform or Application JWT is presented.
2. **Membership:** Verify the user is an `ACTIVE` member of the application.
3. **Role Evaluation:** Establish the maximum allowed capabilities of the user's base role (`ADMIN`, `OPERATOR`, `VIEWER`).
4. **Device Association:** Verify the requested device is assigned to the application via `application_devices`.
5. **Device Permission Fetch:** Fetch any overrides defined in `application_user_device_permissions`. If none exist, safe defaults apply.
6. **Intersection:** Calculate `Effective Permission = Role Max ∩ Device Permission`.
7. **Action:** Allow or deny based on the Effective Permission.

### Safe Defaults
When a device is added to an application, users assume base permissions by default. A new override record defaults to:
- `can_view` = `true`
- `can_read_data` = `true`
- `can_command` = `false`

*Command access must be explicitly enabled if an operator's default command privilege is overridden.*

### Role Maximums & Escalation Prevention
Permissions are strictly reductive. A device permission can **never** escalate a user's privileges beyond their Role's maximums.
- `VIEWER` + `can_command=true` ➔ **COMMAND DENIED**
- `OPERATOR` + `can_command=false` ➔ **COMMAND DENIED**
- `OPERATOR` + `can_command=true` ➔ **COMMAND ALLOWED**

**Admins:** The Application ADMIN role maintains supreme management authority. Admin accounts bypass the reductive intersection, preserving their ability to configure the application even if a restrictive permission rule is accidentally applied.

## Security Constraints
- **Unassigned Devices:** Access is completely prohibited. Device permission tables cannot bypass the core application-device association check.
- **Cross-Application Leaks:** Handled server-side. The middleware strictly checks device permissions scoped exactly to the `application_id`.
- **Command Leakage to MQTT:** If an HTTP command is rejected, the MQTT publish routine is never reached.

## API Endpoints
### `PATCH /api/applications/:id/devices/:device_id/permissions`
- **Requires**: `ADMIN` role
- **Body**: `{ user_id, can_view, can_read_data, can_command }`
- **Action**: Upserts the device permission mapping for a specific user into the database.

## Tests & Verification
This entire architecture was verified using an aggressive test suite covering edge cases and database data retention:
- `applicationPermissions.test.js`: Validated strict HTTP-level boundary crossing and escalation blocking.
- `test_phase6e.py`: Verified E2E workflows against Mosquitto and PostgreSQL.
- Database Rows verified before and after to ensure strict **data preservation**.
