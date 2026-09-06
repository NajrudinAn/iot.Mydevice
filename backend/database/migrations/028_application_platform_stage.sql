-- Phase: Application Platform Stage
-- File: backend/database/migrations/028_application_platform_stage.sql

BEGIN;

-- Add authentication and deployment fields to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS authentication_api_id UUID REFERENCES apis(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deployment_mode VARCHAR(20) NOT NULL DEFAULT 'DEVELOPMENT' CHECK (deployment_mode IN ('DEVELOPMENT', 'DEPLOYED'));

-- Create application_api_access table for linking Applications to multiple allowed API Packages
CREATE TABLE IF NOT EXISTS application_api_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    api_id UUID NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_id, api_id)
);

-- Index for fast lookup of an application's allowed APIs
CREATE INDEX IF NOT EXISTS idx_application_api_access_app ON application_api_access(application_id);
CREATE INDEX IF NOT EXISTS idx_application_api_access_api ON application_api_access(api_id);

COMMIT;
