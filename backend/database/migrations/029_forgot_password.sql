-- Add columns for password reset
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
