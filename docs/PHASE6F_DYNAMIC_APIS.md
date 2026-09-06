# Phase 6F: Dynamic API Builder & Secure API Access

## Overview
Phase 6F introduces a robust external API engine allowing Application Administrators to create safe, predictable, and dynamically routed HTTP endpoints. These APIs serve application telemetry strictly adhering to configured constraints without exposing internal abstractions or risking unintended device command execution.

## The API Scope Model
Each Dynamic API (`ApiDefinition`) is bound strictly to:
1. **Application Context**: APIs cannot span multiple applications.
2. **Device Whitelist**: Only devices explicitly bound to the API (`api_definition_devices`) can be queried. Attempting to query an unassigned device returns a `403 Forbidden`.
3. **Field Whitelist**: Only explicitly configured sensor data fields (e.g. `temperature`, `humidity`) are emitted. Secure internal identifiers, password hashes, and MQTT credentials are structurally unqueryable.
4. **Authentication Policy**: APIs can be secured behind uniquely generated API Keys, or optionally made public.

## Security Contexts
This platform now operates using three strictly isolated authentication boundaries:
- **Platform JWT**: Used for managing high-level objects (Workspaces, Applications).
- **Application JWT**: Used by Application Users to interact within the application boundaries (Dashboards, Overrides).
- **External API Key**: Used by third-party systems (e.g. external dashboards or remote servers) to consume the `ApiDefinition` telemetry. These keys do not grant access to the REST platform management APIs.

## Key Management & Cryptography
API Keys are secured using standard cryptographic procedures:
- Keys are 32 bytes (64 hex characters) long, generated using `crypto.randomBytes()`.
- The raw key is returned exactly **once** upon creation.
- Only a cryptographically salted `bcrypt` hash and a 16-character plaintext prefix are stored in PostgreSQL.
- Verifications check the plaintext prefix to locate the candidate hash, preventing database full-table cryptographic timing attacks.

## API Endpoint Reference

### Creating an API Definition (Platform/Application Context)
`POST /api/applications/:id/apis`
Requires `ADMIN` role.

### Configuring Exposed Devices
`POST /api/applications/:id/apis/:api_id/devices/:device_id`
Requires `ADMIN` role. Device must belong to the application.

### Generating an External API Key
`POST /api/applications/:id/apis/:api_id/keys`
Requires `ADMIN` role.
```json
{
  "name": "Production Third-Party Key"
}
```
**Response:**
```json
{
  "raw_api_key": "c4d3...e9f2"
}
```

### Consuming the Dynamic API (External Context)
`GET /api/v1/applications/:application_id/public-api/:slug?limit=50&device_id=DEV-XYZ`
**Header:** `X-API-Key: c4d3...e9f2`
**Response:**
```json
{
  "api": "my-slug",
  "data": [
    {
      "temperature": 23.4,
      "recorded_at": "2026-09-01T10:00:00Z"
    }
  ]
}
```

## Security Guarantees & Verification
During Phase 6F, extensive Python-based concurrent end-to-end integration tests (`test_phase6f.py`) and standard backend unit tests were performed on the real running systems.
- **Data Leakage Proof:** External API queries filtering against unassigned devices were trapped and returned HTTP `403`.
- **Field Stripping:** Any fields outside the DB array `allowed_fields` strictly vanish from the SQL projection matrix.
- **Cross-App Leakage:** Revoked, expired, or cross-application API keys are unconditionally trapped by the `externalApiAuth` middleware.
- **No-Destruction:** All preceding Phase 1 - 6E regression testing remains fully functional (`npm test` 94/94 passing).
