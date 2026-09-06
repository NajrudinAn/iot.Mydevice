-- Phase 9: MyDevice-Managed Actions

CREATE TABLE IF NOT EXISTS managed_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    command_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    capability_group VARCHAR(100),
    parameters JSONB DEFAULT '{}',
    state_mapping JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, command_name)
);

CREATE TABLE IF NOT EXISTS device_managed_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    managed_action_id UUID NOT NULL REFERENCES managed_actions(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(managed_action_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_managed_actions_workspace_id ON managed_actions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_device_managed_actions_device_id ON device_managed_actions(device_id);
