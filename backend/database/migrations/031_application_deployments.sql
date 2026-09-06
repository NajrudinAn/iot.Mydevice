CREATE TABLE IF NOT EXISTS application_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    file_count INTEGER NOT NULL DEFAULT 0,
    total_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_application_deployments_app_id ON application_deployments(application_id);
