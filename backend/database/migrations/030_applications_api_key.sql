-- Phase: Application Credentials
-- File: backend/database/migrations/030_applications_api_key.sql

BEGIN;

-- Add application-level API credentials to support X-App-Key/X-App-Secret authentication
-- These are generated in Application.create() and are distinct from api_credentials
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS api_secret_hash VARCHAR(255);

COMMIT;
