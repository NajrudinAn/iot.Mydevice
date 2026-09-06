-- Phase 7: Device Commands History
CREATE TABLE IF NOT EXISTS device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    command_type VARCHAR(255) NOT NULL,
    command_payload JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    correlation_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_code VARCHAR(255),
    error_message TEXT,
    response_payload JSONB,
    CONSTRAINT status_check CHECK (status IN ('PENDING', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'FAILED', 'TIMEOUT', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_device_commands_workspace_id ON device_commands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);
CREATE INDEX IF NOT EXISTS idx_device_commands_created_at ON device_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_device_commands_correlation_id ON device_commands(correlation_id);
