-- Phase 10: Remove MyDevice-Managed Actions
-- As per the final Command/Capability Model, the Device is the sole source of truth for capabilities.
-- We no longer support manual creation or assignment of actions.

DROP TABLE IF EXISTS device_managed_actions CASCADE;
DROP TABLE IF EXISTS managed_actions CASCADE;
