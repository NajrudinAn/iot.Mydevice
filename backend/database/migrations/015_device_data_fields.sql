-- Phase 6: Workspace Data Telemetry V2 (Dynamic Data Fields)

CREATE TABLE IF NOT EXISTS device_data_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    data_type VARCHAR(50) NOT NULL,
    unit VARCHAR(50),
    description TEXT,
    category VARCHAR(100),
    is_manual BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, field_name)
);

-- Index for quickly loading fields for a specific device
CREATE INDEX IF NOT EXISTS idx_device_data_fields_device_id ON device_data_fields(device_id);

-- Make sure we have an index on sensor_data payload if we need to query keys (GIN index)
CREATE INDEX IF NOT EXISTS idx_sensor_data_payload_gin ON sensor_data USING GIN (payload);

-- Workspace isolated fast index for 'All Devices' view
CREATE INDEX IF NOT EXISTS idx_devices_workspace_id ON devices(workspace_id);
