ALTER TABLE api_routes ADD COLUMN IF NOT EXISTS calls_count integer DEFAULT 0;
