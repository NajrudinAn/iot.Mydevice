-- Phase 6F: Dynamic API Builder & Secure API Access

-- 1. api_definitions table
CREATE TABLE IF NOT EXISTS api_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    authentication_required BOOLEAN DEFAULT true,
    enabled BOOLEAN DEFAULT true,
    allowed_fields TEXT[] DEFAULT ARRAY['device_id', 'temperature', 'humidity', 'recorded_at']::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (application_id, slug)
);

-- 2. api_definition_devices table
CREATE TABLE IF NOT EXISTS api_definition_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_definition_id UUID NOT NULL REFERENCES api_definitions(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (api_definition_id, device_id)
);

-- 3. api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_definition_id UUID NOT NULL REFERENCES api_definitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (key_prefix)
);
