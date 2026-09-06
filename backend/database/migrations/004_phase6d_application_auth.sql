-- Phase 6D: Application Authentication Settings
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS authentication_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false;
