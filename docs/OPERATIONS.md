# Running the CRM and demo

## Local demo

The demo uses a separate single-node replica set on port 27018 and database `financial_crm_demo`. The original database is unchanged; the previous server configuration is in the ignored `server/.env.before-demo`.

From `server`:
```sh
npm run demo:setup
npm run seed:demo
npm run dev
```
From `client`: `npm run dev`, then open http://localhost:5173.

Sign in with the local credentials in `server/.demo-login.txt`. This file is ignored by Git. Seeding is additive, never deletes records, and leaves an existing demo account unchanged. Sample data: 6 clients, 6 projects, 18 invoices, 12 payments and 18 expenses across six months.

After restarting Windows, run `npm run demo:setup` to restart the demo MongoDB process. The data is under ignored `.local/mongo-demo`. Do not use this loopback-only, unauthenticated database for production.

## Invitations and account recovery

- Team page: invite a member. Invitation links expire after one hour and can be used once. Reinviting invalidates the previous link.
- New invitees choose a password. Existing users enter their existing password; accepting an invitation does not reset it.
- Removed invitations cannot be accepted.
- Team page: request email verification. Verification links expire after one hour.
- Forgot password: queues an email and returns a uniform production response. Resetting a password revokes all sessions.
- Local development exposes preview links for invitations/verification and retains the existing recovery-token preview. Never publish a development-mode API.

Mail is stored in a durable outbox with retries, leasing, expiry, and provider idempotency. To enable real delivery, configure `RESEND_API_KEY`, `MAIL_FROM` (a sender on your verified domain), and `CLIENT_URL`. Run a separate persistent worker:
```sh
npm run mail:worker
```
No real email was sent during implementation. Production startup requires these settings and an HTTPS client URL. The provider integration is tested with a mock transport; actual delivery requires your account credentials.
Provider reference: https://resend.com/docs/api-reference/emails/send-email

## Production operations

- Use a MongoDB replica set/Atlas deployment. Transactions and unique indexes are required.
- Deploy the API as a persistent Node service and the mail worker separately; host the Vite build as static files with an SPA fallback to index.html.
- Set exact `CLIENT_URL`, client `VITE_API_URL`, unique long JWT secrets, and `NODE_ENV=production`.
- Prefer frontend/API on the same site (for example app.example.com and api.example.com); existing SameSite=Lax cookies do not support arbitrary cross-site domains.
- Set `TRUST_PROXY_HOPS` only to the exact number of trusted proxies. Otherwise leave it blank.
- Rate limits share MongoDB counters across API instances. A database failure does not silently disable limits.
- HTTP logs include request IDs, paths without query strings, response codes, and durations. Error logs omit credentials and request bodies.
- Configure your hosting monitor to poll `/api/health` and alert on failures. Monitor failed/pending `mailjobs`; do not expose outbox contents publicly.
- CI runs backend tests inside a MongoDB image, so the isolated test replica sets have a local binary. Frontend tests/build run separately. Remote CI execution still needs a push to GitHub.
- Schedule backups with your hosting scheduler; use encrypted storage, restricted access and an explicit retention policy. No paid services, remote deployment, external alerts, or schedules have been enabled.

## Backup and restore

Version 2 backups preserve BSON types, nested references/dates/decimals, indexes, record counts, and file checksums. Collection data is read within a snapshot transaction. Pause schema changes during backup. Backup files contain sensitive information and must be protected.

```sh
npm run backup -- /secure/path/backup-2026-11-04
```

To restore, point `MONGO_URI` at a separate empty replica-set database and set `RESTORE_DATABASE` to its exact name:
```sh
npm run restore -- /secure/path/backup-2026-11-04
```
Existing data is refused unless `RESTORE_REPLACE=YES` explicitly authorizes replacement. Files/checksums are validated before mutation; data restoration is transactional. Collections outside the backup are retained. Version 1 JSON backups are rejected because type fidelity cannot be guaranteed.

## Verification and limits

```sh
npm --prefix server test
npm --prefix client test
npm --prefix client run build
```

Backend tests use temporary databases, never application data. Mail tests mock the external provider. Native dialogs supply keyboard focus containment/Escape handling, labelled titles/buttons, and restore prior focus. Workspace query refreshes now match scoped cache keys.

Performance smoke tests report timings and verify indexes. Set `ANALYTICS_MAX_MS` for a controlled benchmark; production-scale load testing and a manual screen-reader/device audit remain release checks.

Phase 3 core onboarding and Phase 4 application-level safeguards are implemented. Hosting, DNS/sender verification, real email delivery, remote CI, external monitoring/backup scheduling, production load tests, and optional Phase 5 integrations require deployment-specific setup.
