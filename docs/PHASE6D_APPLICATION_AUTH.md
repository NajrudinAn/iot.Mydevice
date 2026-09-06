# Phase 6D: Application Authentication

## Overview
Phase 6D introduces an independent authentication mechanism that securely scopes user access to specific applications. This separation ensures that **Platform Management** and **Application Execution** are handled in distinct contexts with separate boundaries.

## Authentication Contexts

1. **Platform JWT**: 
   - Used for global management APIs (Workspaces, Applications, Devices).
   - Issued from `/api/auth/login` or `/api/auth/register`.
   - Cannot automatically access application-specific resources without explicitly being authorized as an Application member or Workspace Owner.

2. **Application JWT**:
   - Strictly scoped to a single application.
   - Contains `{ type: 'application', applicationId: <ID> }`.
   - Cannot be used to access platform management APIs.
   - Cannot be used to access other applications (cross-application isolation).

## Login Flow
1. User provides `email` and `password` to `POST /api/applications/:id/auth/login`.
2. Backend verifies credentials against the platform `users` table.
3. Backend validates the Application exists and `authentication_enabled` is true.
4. Backend ensures the user holds a membership in `application_users` with status `ACTIVE`.
5. An Application JWT is issued containing user ID and application ID.

## Security Rules
- **Cross-Application Access Rejected**: An Application JWT for Application A will immediately be rejected if used on endpoints belonging to Application B.
- **Platform Access Rejected**: Application Tokens will be rejected globally by the core `authMiddleware` for any route that does not pertain to applications.
- **Disabled Users**: If a user's status is changed to `DISABLED` after a token is issued, subsequent requests will be blocked by `requireApplicationRole`, which dynamically reads database state.
- **Secrets Hidden**: Tokens only contain identifying claims (ID, email, Role), never passwords or secret keys.

## Testing & Verification
A rigorous suite of tests verifies the above conditions:
- **Jest Suite (`tests/applicationAuth.test.js`)**: Runs 13 detailed scenarios checking login permutations, wrong credentials, token mismatching, and endpoint permissions.
- **Python Integration (`scripts/test_phase6d.py`)**: Runs comprehensive End-to-End tests simulating cross-user and cross-application scenarios, validating robust token scope isolation against a running server.

## Future Dependencies
- `registration_enabled`: Set up for a future self-service application signup flow.
- `approval_required`: Pre-configured for an application approval workflow.
