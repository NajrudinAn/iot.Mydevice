# PHASE 6M - PRODUCT MODEL

## 1. Tenancy Architecture
The IoT Platform follows a strict multi-tenant architecture designed to separate platform operations from customer application operations.

```
                    PLATFORM (Platform Admin)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    Workspace A    Workspace B    Workspace C (Platform Users)
        │              │              │
   Applications    Applications    Applications
        │
   Application A (Owned by Workspace, Managed by Application Admin)
        │
   ┌────┼───────────────┐
   │    │               │
Users Devices       Dashboards
   │    │               │
   │    │           Data Sources
   │    │               │
   │    └──── Telemetry
   │
   └──── Roles/Permissions (Application Users: ADMIN, OPERATOR, VIEWER)
```

## 2. Platform Admin vs Application Admin
### Platform Admin (Platform User)
- **Role:** Administrator of the entire IoT platform instance.
- **Identity:** Exists in the global `users` table. Logs in via `/api/auth/login`.
- **Capabilities:**
  - Can view platform health, total workspaces, applications, users, devices, and global metrics.
  - Can create and manage their own Workspaces.
  - Can inspect high-level statistics of applications within their workspaces.
- **Restrictions:**
  - **CANNOT** control customer application devices directly from the platform view.
  - **CANNOT** bypass application-level authentication to manage application-specific users, API keys, or dashboards without explicit backend super-admin capabilities (which are deliberately segregated).

### Application Admin (Application User)
- **Role:** Owner/Administrator of a specific IoT application.
- **Identity:** Exists in the `application_users` table. Logs in via `/api/applications/:id/auth/login`.
- **Capabilities:**
  - Full control over their application environment.
  - Assign devices to the application (from the parent workspace).
  - Manage Application Users (approve, assign roles).
  - Create and manage Dashboards and Data Sources.
  - Create API definitions and API keys.
  - Configure Application Domains and Branding.
- **Restrictions:**
  - Isolated strictly to their specific Application ID. Cannot access other applications in the same workspace unless explicitly added as a user there.

## 3. Application Roles & Permissions
Within an Application, users belong to one of three roles, dictated by `application_users.role`:
- **ADMIN:** Unrestricted access within the application. Can manage users, devices, dashboards, APIs, and settings.
- **OPERATOR:** Can view Dashboards, view telemetry, and issue commands to devices *only if explicitly granted permission* via `application_user_device_permissions`. Cannot manage users or API keys.
- **VIEWER:** Can only view Dashboards and Telemetry. Cannot issue commands to devices or edit dashboards.

## 4. Telemetry and Data Flow
- **Ingestion:** Devices publish via MQTT (`devices/:id/data`).
- **Processing:** Backend verifies device assignment to a workspace/application and stores data in PostgreSQL (`sensor_data`).
- **Consumption:** Dashboards consume telemetry via Data Sources, which map specific telemetry streams to devices.
- **Commands:** Issued via `devices/:id/command`. Backend strictly verifies `application_user_device_permissions` before publishing the MQTT command.

## 5. Security Boundaries
- **Authentication:** Platform tokens (`platform_token`) are strictly isolated from Application tokens (`app_token_:id`). A platform user cannot inherently access application-specific endpoints without a valid application token, enforcing strict logical boundary.
- **Authorization:** `authorizeApplicationUser` middleware enforces Application User roles and permissions for any request targeting `/api/applications/:id/*`.
