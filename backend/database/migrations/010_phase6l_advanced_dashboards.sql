-- Phase 6L: Advanced Dashboards & Branding

BEGIN;

-- 1. Extend applications with branding
ALTER TABLE applications ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(500);

-- 2. Extend dashboards with theme and position
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system';
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 3. Junction table for Data Sources <-> Devices
CREATE TABLE IF NOT EXISTS dashboard_data_source_devices (
    source_id UUID NOT NULL REFERENCES dashboard_data_sources(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    PRIMARY KEY (source_id, device_id)
);

-- Note: We still have device_id in dashboard_data_sources. 
-- In a real production migration, we might backfill dashboard_data_source_devices from it.
-- Let's do a safe backfill:
INSERT INTO dashboard_data_source_devices (source_id, device_id)
SELECT id, device_id 
FROM dashboard_data_sources 
WHERE device_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- We could drop the column, but to maintain backward compatibility during rollout, we'll keep it nullable.
ALTER TABLE dashboard_data_sources ALTER COLUMN device_id DROP NOT NULL;

COMMIT;
