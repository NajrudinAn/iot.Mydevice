-- Phase 6E: Advanced Device, Data & Command Permissions
CREATE TABLE IF NOT EXISTS application_user_device_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_read_data BOOLEAN DEFAULT true,
    can_command BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (application_id, user_id, device_id)
);
