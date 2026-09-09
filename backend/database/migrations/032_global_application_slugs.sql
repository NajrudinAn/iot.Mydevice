-- 032_global_application_slugs.sql
-- Upgrades the applications table to enforce global slug uniqueness.
-- This is necessary because Application slug maps to <slug>.mydevice.in in the wildcard DNS/Nginx setup.

ALTER TABLE applications DROP CONSTRAINT applications_workspace_id_slug_key;
ALTER TABLE applications ADD CONSTRAINT applications_slug_key UNIQUE (slug);
