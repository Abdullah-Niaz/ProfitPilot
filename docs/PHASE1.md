# Phase 1 — API and session hardening

Implemented November 3, 2026. This phase stabilizes the existing MERN application; it does not complete the financial engine or UI redesign.

## Changes

- Strict request schemas reject unknown fields, update operators, invalid IDs, negative amounts, and invalid enum values. Updates use explicit `$set` fields and Mongoose validators.
- Workspace ownership cannot be changed through resource updates. Related clients, projects, and assigned members must belong to the authorized workspace; a project's client must match the transaction's client.
- Workspace membership is checked on protected requests, including profile access. Advisor and profitability lookups are workspace-scoped. Populated client details are scoped too, including historical invalid references.
- Client list/detail queries no longer populate a nonexistent field. Expense aggregation casts workspace IDs correctly.
- Express 4 asynchronous handlers forward rejections to a consistent error handler. Invalid sessions, bad JSON, validation errors, duplicate records, and missing records return controlled responses without stack traces.
- Sessions store hashed refresh tokens. Browser refresh credentials use an HttpOnly, SameSite=Lax cookie; production cookies are Secure. Refresh uses atomic token rotation. Logout revokes the session immediately, including existing access tokens.
- Client requests share one refresh operation, reject stale responses across account changes, and clear cached account data on login/logout. Query keys include user and workspace identity.
- Registration records the email as unverified. Actual email verification and password recovery workflows remain for Phase 3; unverified accounts can still use the current app.
- Authenticated financial hard deletion is blocked until Phase 2 implements audited reversals. Linked clients/projects cannot be deleted; projects with financial records cannot be moved to another client. Workspace currency cannot be changed after budgets or financial records exist.
- The seed script no longer logs connection strings or passwords. It requires development mode, a local database with a `_dev`, `_test`, or `_demo` suffix, its exact name, a reset acknowledgement, and a supplied demo password.

## Running the application

Copy `server/.env.example` to `server/.env`, configure the database, and generate two independent secrets:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set each JWT secret to a different result. Existing tokens issued before this update are rejected; users must sign in again. No existing application data is migrated by this phase. The session collection and its expiry index are created through Mongoose.

Keep the browser and API on the same site (localhost on different ports works), and set `CLIENT_URL` to the exact browser origin. Do not mix localhost and 127.0.0.1. A production deployment should use HTTPS and a same-site API hostname or reverse proxy. Cross-site cookie deployment is not enabled by this implementation.

The browser sends the refresh cookie with credentials. API consumers must retain this cookie after login and send it to `/api/auth/refresh-token` and `/api/auth/logout`; refresh tokens are no longer returned in JSON. A successful refresh replaces the cookie. Logout is idempotent and works with an expired access token when the signed refresh cookie is present.

## Tests

From `server`:

```bash
npm test
```

The integration suite starts an isolated local `mongod` on an available port, creates a fresh temporary database, tests real HTTP requests, and removes its own temporary data afterward. It never loads the app's `.env` or uses its configured MongoDB database. Install MongoDB locally and place `mongod` on PATH, or set `MONGOD_BINARY` to its executable. Common Windows installation paths are detected automatically.

Coverage includes ownership/field tampering, cross-workspace requests, related-record validation, populated-reference redaction, expense aggregation, role permissions, refresh races/replay, logout revocation, removed membership, expired tokens, and seed guards.

From `client`, run `npm test` for session/cache checks and `npm run build` to check the production bundle.

### Verification results

- 15 backend HTTP integration tests passed against a freshly started MongoDB 9.0 instance, including an injected database failure followed by a successful recovery request.
- 4 client-session tests passed: account cache isolation, concurrent refresh deduplication, refresh failure behavior, and stale-response rejection.
- Production frontend compilation passed. In the restricted execution environment, Vite's configuration loader could not scan a parent folder; the equivalent build was run through Vite's API with the same imported configuration and `configFile:false`.
- A full browser interaction pass and production deployment have not been performed. The bundle still emits a size warning; code splitting belongs to the UI/performance work in later phases.

## Remaining phases

1. **Phase 2 — Financial correctness:** exact money/currency representation, invoice and payment relationships, audited corrections, posting idempotency, reporting basis, date semantics, and transactional consistency.
2. **Phase 3 — Usable MVP and redesign:** functional creation/edit forms, mobile navigation, tables, clear error/empty states, invitations, email verification, and recovery.
3. **Phase 4 — Controlled release:** CI, deployment checks, durable/distributed rate limiting, monitoring, backup restoration, accessibility and performance testing.
4. **Phase 5 — Optional integrations:** accounting exports/sync, receipt storage, recurring templates, time tracking, and richer forecasts.

Current limits: monetary values still use Number; revenue reports still need Phase 2's cash-versus-earned definitions; financial updates do not yet have an audit ledger. Relationship existence checks are not multi-document transactions, so concurrent reference changes require additional Phase 2 handling. Existing access tokens remain in browser localStorage; refresh tokens do not. In-process rate limiting is not sufficient for a multi-instance deployment. No live deployment was performed.
