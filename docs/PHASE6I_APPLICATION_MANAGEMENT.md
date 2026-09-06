# Phase 6I - Application Management & User Onboarding

## Architecture Summary
Phase 6I introduces dynamic application routing and self-serve onboarding. This allows external users to discover and request access to applications created by platform tenants, while strictly preserving the isolation between Platform identities and Application memberships.

### Features
1. **Application Slug Routing**: End-users can access applications at `/app/:applicationSlug` rather than relying on internal UUIDs.
2. **Public Resolver Endpoint**: A lightweight, unauthenticated endpoint `GET /api/applications/slug/:slug` resolves slugs to Application IDs, providing only safe public metadata necessary to bootstrap the React frontend.
3. **Application Registration**: 
   - New users (emails not known to the platform) are registered on the platform, and automatically added to the application with a status determined by `approval_required`.
   - Existing users (emails already on the platform) are intentionally rejected from registering again (preventing unauthorized password resets) with the `ACCOUNT_EXISTS` code.
4. **Access Request Flow**: Authenticated platform users can request access to an application via `POST /api/applications/:id/auth/request-access`. This guarantees the identity of the user before associating them with the application.
5. **Approval Workflow**: The membership status `PENDING` prevents login. Application Admins must manually approve `PENDING` users (upgrading them to `ACTIVE`) from the Application Admin Panel.

## Security Controls
- **Duplicate Membership Protection**: The system securely prevents double-registration or duplicate application memberships.
- **Strict Registration Bounding**: Application users are prevented from impersonating other users during registration. 
- **Last-Admin Protections**: Ensures no Application can be left without an Active Admin.
- **Enforced Disabled Status**: A `DISABLED` user instantly loses all API access privileges, even if they have an active session token.

## Endpoints

- `GET /api/applications/slug/:slug` (Public)
- `POST /api/applications/:id/auth/register` (Public)
- `POST /api/applications/:id/auth/request-access` (Platform Auth Required)
- `POST /api/applications/:id/auth/login` (Application Login)
