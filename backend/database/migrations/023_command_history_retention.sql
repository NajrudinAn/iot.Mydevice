-- Phase 11: Command History Retention
-- Add command_history_retention_seconds to workspaces table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='workspaces' AND column_name='command_history_retention_seconds') THEN
        ALTER TABLE workspaces ADD COLUMN command_history_retention_seconds INTEGER DEFAULT 604800;
    END IF;
END $$;
