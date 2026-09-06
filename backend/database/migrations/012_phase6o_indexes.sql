-- Phase 6O: Performance & Reliability Indices

-- application_devices is frequently joined on application_id
CREATE INDEX IF NOT EXISTS idx_application_devices_application_id ON application_devices(application_id);

-- application_users is frequently joined on application_id and user_id
CREATE INDEX IF NOT EXISTS idx_application_users_application_id ON application_users(application_id);
CREATE INDEX IF NOT EXISTS idx_application_users_user_id ON application_users(user_id);

-- api_keys are queried by key_hash during API authentication
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
