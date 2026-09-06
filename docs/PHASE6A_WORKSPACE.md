# Phase 6A: Workspace & Database Foundation

## Overview
Phase 6A introduces the logical `Workspace` boundary to the IoT Platform. This is the foundational prerequisite for the upcoming Dashboard application, allowing devices and users to be grouped logically instead of having a direct `User-to-Device` mapping.

## Database Changes
- **`workspaces` table**: Created to track workspaces (`id`, `name`, `owner_id`, `created_at`).
- **`devices` table**: Updated to include a `workspace_id` foreign key.
- **Migration Strategy**: The migration (`database/migrations/001_phase6a_workspaces.sql`) uses a non-destructive `ALTER TABLE` approach. It creates a default workspace for every existing user and assigns their existing devices to that default workspace to ensure zero data loss.

## Backend APIs
- **`POST /api/workspaces`**: Create a new workspace.
- **`GET /api/workspaces`**: List all workspaces owned by the user.
- **`GET /api/workspaces/:id`**: Get a specific workspace's details.
- **`POST /api/workspaces/:workspace_id/devices`**: Register a device explicitly to a specific workspace.
- **`GET /api/workspaces/:workspace_id/devices`**: List all devices within a specific workspace.

## Backward Compatibility
- A **"Default Workspace"** is automatically created when a new user registers.
- The legacy `POST /api/devices` route automatically associates new devices with the user's default workspace if a `workspace_id` is not explicitly provided.
- The legacy `GET /api/devices` route still lists devices by `user_id` to maintain compatibility with Phase 1-5 tests and applications.

## Isolation and Security
- Server-side enforcement guarantees that users can only view, fetch, or register devices into a workspace that they own. Any attempt to access another user's workspace yields a `403 Forbidden` or `404 Not Found` response.
