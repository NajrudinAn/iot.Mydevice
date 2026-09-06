-- Idempotent Migration: Add data_retention_days to applications

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='applications' AND column_name='data_retention_days') THEN
        ALTER TABLE applications ADD COLUMN data_retention_days INT DEFAULT 0;
    END IF;
END $$;
