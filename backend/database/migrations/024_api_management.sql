-- Phase: API Management
-- File: backend/database/migrations/024_api_management.sql

BEGIN;

-- 1. api_routes table
CREATE TABLE IF NOT EXISTS api_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, PATCH
    path VARCHAR(255) NOT NULL,
    normalized_path VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- CURRENT_DATA, HISTORY, DEVICE_STATUS, COMMAND, REALTIME
    auth_mode VARCHAR(50) NOT NULL, -- PUBLIC, APPLICATION_SESSION, API_KEY_SECRET
    device_scope VARCHAR(50) NOT NULL DEFAULT 'ALL', -- ALL, SINGLE, SELECTED
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, method, normalized_path)
);

-- 2. api_route_devices table
CREATE TABLE IF NOT EXISTS api_route_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_route_id UUID NOT NULL REFERENCES api_routes(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (api_route_id, device_id)
);

-- 3. api_route_data_permissions table
CREATE TABLE IF NOT EXISTS api_route_data_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_route_id UUID NOT NULL REFERENCES api_routes(id) ON DELETE CASCADE,
    field_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (api_route_id, field_path)
);

-- 4. api_route_command_permissions table
CREATE TABLE IF NOT EXISTS api_route_command_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_route_id UUID NOT NULL REFERENCES api_routes(id) ON DELETE CASCADE,
    command_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (api_route_id, command_type)
);

-- 5. apis table
CREATE TABLE IF NOT EXISTS apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, DISABLED
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- 6. api_api_routes table (M:M relation between apis and api_routes)
CREATE TABLE IF NOT EXISTS api_api_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id UUID NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    api_route_id UUID NOT NULL REFERENCES api_routes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (api_id, api_route_id)
);

-- 7. api_credentials table
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id UUID NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    secret_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, DISABLED
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- 8. api_user_access table
CREATE TABLE IF NOT EXISTS api_user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id UUID NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    app_user_id UUID NOT NULL REFERENCES application_users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (api_id, app_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_routes_workspace ON api_routes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_apis_workspace ON apis(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_key ON api_credentials(api_key);
CREATE INDEX IF NOT EXISTS idx_api_user_access_user ON api_user_access(app_user_id);

COMMIT;
