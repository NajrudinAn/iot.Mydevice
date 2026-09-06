-- Phase 6K: Dashboard Data Sources

CREATE TABLE IF NOT EXISTS dashboard_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- DEVICE_TELEMETRY, API_DEFINITION
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE, -- Allow specific device tracking
    api_definition_id UUID REFERENCES api_definitions(id) ON DELETE CASCADE,
    data_field VARCHAR(100) NOT NULL, -- "temperature", "humidity", "recorded_at"
    query_mode VARCHAR(50) NOT NULL DEFAULT 'LATEST', -- LATEST, HISTORY, AGGREGATED
    time_range VARCHAR(50) DEFAULT 'LAST_1_HOUR', -- LAST_1_HOUR, LAST_24_HOURS, CUSTOM
    aggregation VARCHAR(50), -- AVG, MIN, MAX, COUNT
    refresh_interval INTEGER DEFAULT 30, -- Seconds (5, 10, 30, 60)
    enabled BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}'::jsonb, -- Store custom time bounds if needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index to quickly find data sources for a device
CREATE INDEX IF NOT EXISTS idx_dashboard_data_sources_device_id ON dashboard_data_sources(device_id);

-- Optional: Performance Index for sensor_data telemetry if it doesn't already exist.
-- To avoid redundant indexes, we only add a composite on device_id + recorded_at for typical timeseries queries
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_time ON sensor_data(device_id, recorded_at DESC);
