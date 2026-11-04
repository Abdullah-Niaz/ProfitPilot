# Phase 2 financial reliability fixes

Updated November 4, 2026.

## Behavior

- Invoice creation and draft editing share one line-item calculator. Totals must match line items; zero totals and amounts outside the safe integer-cent range are rejected.
- Invoice mutations, payment posting/reversal, and revenue/expense posting/reversal run in MongoDB transactions. The HTTP success response is sent only after commit.
- Audit events are part of the same transaction and identify the authenticated user. An audit storage failure cancels the financial operation.
- Competing payments, reversals, and invoice voids retry against a fresh transaction snapshot. A payment cannot commit against a void invoice, and a reversal cannot restore the balance twice.
- Posted revenue and expenses cannot be edited. Reverse and repost corrections; reverse payment-linked revenue through its payment.
- Payment project/client relationships are validated, including invoice payments. Populated invoice references are workspace-scoped.
- Idempotency reservations and successful responses commit with the financial operation. A failed transaction leaves neither a payment nor a reservation. Replays require the same actor, route, and payload.
- The browser adds idempotency keys to financial POST requests, retaining the key for an uncertain retry in the current tab and during access-token refresh. Identical concurrent submissions share a key. After success, a new submission receives a new key.
- Migration reads use plain stored documents so model defaults cannot replace legacy paid balances or workspace currency.

## Database requirement

Use an initialized MongoDB replica set or a sharded cluster, such as a MongoDB Atlas deployment. Standalone MongoDB does not support these transactions. API startup now rejects standalone deployments instead of allowing inconsistent financial writes.

For an existing local database, back it up and follow MongoDB's replica-set conversion instructions before restarting the API. This change does not alter your running database, local secrets, or existing MongoDB service.

Example connection for an already initialized local replica set:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/financial_crm_dev?replicaSet=rs0
```

The example environment file includes this requirement. Startup waits for model indexes, including the unique workspace/idempotency-key index.

Transaction session propagation uses Mongoose's documented AsyncLocalStorage support:
https://mongoosejs.com/docs/8.x/docs/transactions.html

## Verification

Run from the repository root:

```sh
npm --prefix server test
npm --prefix client test
npm --prefix client run build
```

Tests launch isolated temporary single-node replica sets using a local `mongod` executable. Set `MONGOD_BINARY` if needed. They do not use the application's database URI.

Regression coverage includes:
- Draft editing, line totals, and immutable sent invoices.
- Rollback after an injected audit failure.
- Simultaneous reversals and duplicate payment submissions.
- Concurrent void versus payment.
- Rejection of unrelated payment projects and posted revenue edits.
- Actor attribution and retained payment balances during legacy migration.
- Browser retries, concurrent submissions, and access-token refresh.

The backup fixture now uses a supported payment method and asserts successful setup. The analytics smoke test verifies response values and indexes and reports duration. Set `ANALYTICS_MAX_MS` only for a controlled benchmark environment; a single local request is not a production performance benchmark.

## Recorded validation

- All 35 backend cases passed across the full-suite run and the targeted rerun after fixing the timing test (15 Phase 1, 14 Phase 2, 3 Phase 3, 3 Phase 4).
- All 6 frontend session/retry tests passed.
- Production Vite build passed using the existing config imported directly into the Vite build API. The normal config bundler hit a local parent-directory access restriction; an initial parallel build ran out of memory, and the isolated retry passed.
- Regression tests use temporary replica sets only; no migration was run against the application database.
- Git whitespace checks and syntax checks for the new transaction/calculation helpers passed.

## Remaining work (superseded where noted in [Operations](OPERATIONS.md))

- Invitation acceptance, email delivery for recovery, and email verification remain Phase 3 work.
- CI still needs a local MongoDB binary compatible with the test harness; the existing service-container setup alone is insufficient.
- Production backup format/type fidelity, monitoring, distributed rate limits, accessibility, and load testing remain Phase 4 work.
- Browser retry keys currently live in memory. After reloading or closing the tab following an uncertain payment result, check payment history before submitting again. API clients should persist and reuse their own key for retries within the 24-hour retention window.
- Reporting is still the existing operational revenue/expense model, not a complete accounting ledger. Currency precision currently assumes two decimal places.
- Test the legacy migration against a backed-up staging copy and reconcile balances before a production rollout.
