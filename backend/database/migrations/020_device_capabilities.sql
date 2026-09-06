-- Phase 8: Device Capabilities

-- Add a hash field to devices to track capability changes deterministically
ALTER TABLE devices ADD COLUMN IF NOT EXISTS capabilities_hash VARCHAR(255);

CREATE TABLE IF NOT EXISTS device_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    type VARCHAR(50),
    state_mapping JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, name)
);

CREATE TABLE IF NOT EXISTS device_capability_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id UUID NOT NULL REFERENCES device_capabilities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    description TEXT,
    parameters JSONB DEFAULT '{}',
    UNIQUE(capability_id, name)
);

CREATE INDEX IF NOT EXISTS idx_device_cap_device_id ON device_capabilities(device_id);
CREATE INDEX IF NOT EXISTS idx_device_cap_workspace_id ON device_capabilities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_device_cap_action_cap_id ON device_capability_actions(capability_id);
