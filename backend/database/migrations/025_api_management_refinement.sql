BEGIN;

-- 1. Add api_slug and auth_mode to apis
ALTER TABLE apis ADD COLUMN IF NOT EXISTS api_slug VARCHAR(255);
ALTER TABLE apis ADD COLUMN IF NOT EXISTS auth_mode VARCHAR(50);

-- Backfill api_slug and auth_mode
-- Default to API_KEY_SECRET as it is the most secure fallback.
UPDATE apis SET 
    api_slug = CONCAT('api-', substr(id::text, 1, 8)),
    auth_mode = 'API_KEY_SECRET'
WHERE api_slug IS NULL OR auth_mode IS NULL;

-- Enforce constraints
ALTER TABLE apis ALTER COLUMN api_slug SET NOT NULL;
ALTER TABLE apis DROP CONSTRAINT IF EXISTS apis_api_slug_key;
ALTER TABLE apis ADD CONSTRAINT apis_api_slug_key UNIQUE (api_slug);
ALTER TABLE apis ALTER COLUMN auth_mode SET NOT NULL;

-- 2. Add endpoint_slug to api_routes
-- We must drop the old unique constraint first.
ALTER TABLE api_routes DROP CONSTRAINT IF EXISTS api_routes_workspace_id_method_normalized_path_key;

ALTER TABLE api_routes ADD COLUMN IF NOT EXISTS endpoint_slug VARCHAR(255);

-- Backfill endpoint_slug
UPDATE api_routes SET 
    endpoint_slug = CONCAT('route-', substr(id::text, 1, 8))
WHERE endpoint_slug IS NULL;

-- Enforce constraints
ALTER TABLE api_routes ALTER COLUMN endpoint_slug SET NOT NULL;
ALTER TABLE api_routes DROP CONSTRAINT IF EXISTS api_routes_endpoint_slug_key;
ALTER TABLE api_routes ADD CONSTRAINT api_routes_endpoint_slug_key UNIQUE (endpoint_slug);

-- 3. Drop obsolete columns
ALTER TABLE api_routes DROP COLUMN IF EXISTS path;
ALTER TABLE api_routes DROP COLUMN IF EXISTS normalized_path;
ALTER TABLE api_routes DROP COLUMN IF EXISTS auth_mode;

COMMIT;
