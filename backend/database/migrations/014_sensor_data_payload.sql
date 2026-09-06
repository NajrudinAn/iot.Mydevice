ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
