# Database Design

The system uses a relational database (MySQL or PostgreSQL). The schema consists of the following tables:

## 1. users
Stores registered platform users.
- `id` (Primary Key, UUID/Int)
- `username` / `email` (String, Unique)
- `password_hash` (String)
- `created_at` (Timestamp)

## 2. workspaces
Stores logical groupings for devices, owned by a user.
- `id` (Primary Key, UUID)
- `name` (String)
- `owner_id` (Foreign Key -> users.id)
- `created_at` (Timestamp)

## 3. devices
Stores registered devices.
- `id` (Primary Key, UUID/Int)
- `device_id` (String, Unique) - The public ID used for MQTT
- `secret_key` (String) - Used for authentication (stored securely if possible)
- `name` (String) - User-friendly name
- `user_id` (Foreign Key -> users.id) - Maintained for backward compatibility
- `workspace_id` (Foreign Key -> workspaces.id) - The workspace this device belongs to
- `status` (Enum/String: online, offline)
- `last_seen` (Timestamp)
- `created_at` (Timestamp)

## 4. sensor_data
Stores historical telemetry data.
- `id` (Primary Key, UUID/Int)
- `device_id` (Foreign Key -> devices.device_id)
- `temperature` (Float)
- `humidity` (Float)
- `recorded_at` (Timestamp)

## 5. commands
Stores command history sent to devices.
- `id` (Primary Key, UUID/Int)
- `device_id` (Foreign Key -> devices.device_id)
- `command` (String)
- `sent_at` (Timestamp)
- `status` (String: sent, delivered, failed)

## 6. applications
Stores applications built within a workspace.
- `id` (Primary Key, UUID)
- `workspace_id` (Foreign Key -> workspaces.id)
- `name` (String)
- `slug` (String, Unique per workspace)
- `description` (Text)
- `authentication_enabled` (Boolean, defaults to true)
- `registration_enabled` (Boolean, defaults to false)
- `approval_required` (Boolean, defaults to false)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## 7. application_devices
Junction table mapping which devices are accessible by which applications.
- `application_id` (Foreign Key -> applications.id)
- `device_id` (Foreign Key -> devices.id)
- `created_at` (Timestamp)

### 7. `application_users` (Phase 6C)
Manages user membership and role assignments within an application.
- `application_id`: UUID, Foreign Key to applications
- `user_id`: UUID, Foreign Key to users
- `role`: Enum (ADMIN, OPERATOR, VIEWER)
- `status`: Enum (ACTIVE, DISABLED)
- `created_at`, `updated_at`: Timestamps

### 8. `application_user_device_permissions` (Phase 6E)
Defines device-specific permission overrides for application users.
- `id`: UUID, Primary Key
- `application_id`: UUID, Foreign Key to applications
- `user_id`: UUID, Foreign Key to users
- `device_id`: UUID, Foreign Key to devices
- `can_view`: Boolean, defaults to true
- `can_read_data`: Boolean, defaults to true
- `can_command`: Boolean, defaults to false
- `created_at`, `updated_at`: Timestamps

### 9. `api_definitions` (Phase 6F)
Defines a dynamic external API endpoint for an application.
- `id`: UUID, Primary Key
- `application_id`: UUID, Foreign Key to applications
- `name`: String
- `slug`: String, unique within application
- `authentication_required`: Boolean
- `allowed_fields`: Text Array (whitelist of columns)
- `enabled`: Boolean

### 10. `api_definition_devices` (Phase 6F)
Junction table restricting which devices an API is allowed to query.
- `id`: UUID, Primary Key
- `api_definition_id`: UUID, Foreign Key to api_definitions
- `device_id`: UUID, Foreign Key to devices

### 11. `api_keys` (Phase 6F)
Secure credentials for accessing dynamic external APIs.
- `id`: UUID, Primary Key
- `api_definition_id`: UUID, Foreign Key to api_definitions
- `name`: String
- `key_prefix`: String, 16 chars, unique
- `key_hash`: String (bcrypt hash of full raw key)
- `enabled`: Boolean
- `expires_at`: Timestamp
- `last_used_at`: Timestamp
