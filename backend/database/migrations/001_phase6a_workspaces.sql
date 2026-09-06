-- Idempotent Migration: Add workspaces and link to devices

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add workspace_id to devices (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='workspace_id') THEN
        ALTER TABLE devices ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create a Default Workspace for existing users who don't have one
INSERT INTO workspaces (name, owner_id)
SELECT 'Default Workspace', id FROM users 
WHERE id NOT IN (SELECT owner_id FROM workspaces);

-- 4. Update existing devices to belong to their user's Default Workspace
UPDATE devices d
SET workspace_id = w.id
FROM workspaces w
WHERE d.user_id = w.owner_id 
  AND d.workspace_id IS NULL;

-- 5. Optional: Make workspace_id NOT NULL after migration
-- We will not make it NOT NULL strictly yet in case older tests insert devices without workspace_id
-- but we will rely on it going forward.
