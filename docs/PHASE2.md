# Phase 2 â€” Establish Trustworthy Financial Data

Implemented November 3, 2026. This phase establishes exact money representation, invoice-to-payment lifecycle, immutable posting with audited reversal workflows, cash vs. accrual date semantics, idempotency keys, compound indexing, and a data-conversion migration plan.

## Changes

### 1. Money Representation & Currency Rules
- Monetary values are represented and stored as integer minor units (`amountInCents`, `totalAmountInCents`, `amountPaidInCents`, `balanceDueInCents`, `budgetInCents`).
- Amounts sent in major units (e.g. `$100.50`) are validated to have at most 2 decimal places (fractional cents like `$10.005` are rejected with `400 Bad Request`).
- Workspace currency is enforced: all financial transactions (`Revenue`, `Expense`, `Invoice`, `Payment`) must match the workspace's currency. Transactions specifying mismatched currencies are rejected.
- Analytics aggregations compute totals using exact integer cents (`$sum: "$amountInCents"`), eliminating binary floating-point drift (e.g. `0.10 + 0.20 = 0.30`, avoiding `0.30000000000000004`).

### 2. Invoice & Payment Relationships
- Invoices track full balance lifecycle: `totalAmountInCents`, `amountPaidInCents`, and `balanceDueInCents`.
- Status state machine:
  - Invoices start as `Draft`. Draft invoices cannot receive payments.
  - Sending transitions the invoice from `Draft` to `Sent`.
  - Recording a payment atomically increments `amountPaidInCents` and decrements `balanceDueInCents`.
  - If `balanceDueInCents === 0`, status becomes `Paid`. If `balanceDueInCents > 0`, status becomes `Partially Paid`.
  - Invoices can only be voided if no payments have been made (`amountPaidInCents === 0`).
- Overpayment prevention:
  - Payments exceeding the remaining invoice balance are rejected (`409 Conflict`).
  - Concurrent payments competing for a balance are handled atomically with MongoDB query constraints (`balanceDueInCents: { $gte: amountInCents }`). If two concurrent requests together exceed the balance, only the first succeeds while the second fails with `409 Conflict`, guaranteeing that balances are never negative.

### 3. Posting, Immutability & Audited Reversals
- Posted financial records (`Revenue`, `Expense`, `Payment`) cannot be hard-deleted or have their monetary amounts mutated in place.
- Corrections require the audited reversal workflow:
  - `POST /api/revenue/:id/reverse`
  - `POST /api/expenses/:id/reverse`
  - `POST /api/payments/:id/reverse`
- Reversing a payment:
  - Marks the payment as `Reversed` with timestamp, actor, and reversal reason.
  - Atomically restores the invoice's `balanceDueInCents` and reverts its status to `Partially Paid` or `Sent`.
  - Automatically reverses any linked `Revenue` entries.
  - Double reversals are rejected (`409 Conflict`).
- All postings and reversals log an immutable entry in `AuditLog` (`POST_REVENUE`, `POST_EXPENSE`, `CREATE_INVOICE`, `SEND_INVOICE`, `VOID_INVOICE`, `POST_PAYMENT`, `REVERSE_PAYMENT`, `REVERSE_REVENUE`, `REVERSE_EXPENSE`).

### 4. Date Semantics (Cash vs. Accrual)
- Transactions record:
  - `effectiveDate`: Earned revenue or incurred expense date (accrual accounting).
  - `settledDate`: Cleared cash receipt or payment date (cash accounting).
  - `createdAt`: Database audit timestamp.
- Analytics overview and monthly profit trends accept `?basis=cash` and `?basis=accrual` query parameters.
  - Cash basis includes only settled/paid transactions (`paymentStatus: 'Paid'`).
  - Accrual basis includes all earned transactions.
  - All aggregations strictly exclude records with `status: 'Reversed'`.

### 5. Idempotency Middleware
- Financial write endpoints support the `Idempotency-Key` (or `X-Idempotency-Key`) header.
- Repeated requests with the same key and payload return the cached response with header `X-Idempotent-Replay: true` without creating duplicate records.
- Reusing an idempotency key with a mutated payload returns `422 Unprocessable Entity`.
- Concurrent duplicate requests with the same key replay the committed response. Legacy incomplete reservations return `409 Conflict`.
- Stored keys expire automatically via a TTL index (24 hours).

### 6. Database Indexes
- Compound indexes added for financial consistency and query performance:
  - `Revenue`: `{ workspace: 1, date: -1 }`, `{ workspace: 1, status: 1 }`, `{ workspace: 1, client: 1 }`, `{ workspace: 1, project: 1 }`, `{ workspace: 1, invoice: 1 }`, `{ workspace: 1, payment: 1 }`
  - `Expense`: `{ workspace: 1, date: -1 }`, `{ workspace: 1, status: 1 }`, `{ workspace: 1, client: 1 }`, `{ workspace: 1, project: 1 }`, `{ workspace: 1, category: 1 }`
  - `Invoice`: `{ workspace: 1, invoiceNo: 1 }` (unique), `{ workspace: 1, status: 1 }`, `{ workspace: 1, client: 1 }`, `{ workspace: 1, dueDate: 1 }`, `{ workspace: 1, issueDate: -1 }`
  - `Payment`: `{ workspace: 1, invoice: 1 }`, `{ workspace: 1, status: 1 }`, `{ workspace: 1, client: 1 }`, `{ workspace: 1, paidAt: -1 }`
  - `AuditLog`: `{ workspace: 1, createdAt: -1 }`, `{ workspace: 1, entity: 1, entityId: 1 }`
  - `IdempotencyKey`: `{ workspace: 1, key: 1 }` (unique), TTL on `expiresAt`

### 7. Data Conversion Migration Plan
- Migration script located at `server/src/migrations/phase2_financial_migration.js`.
- Backfills legacy databases:
  - Computes `amountInCents = Math.round(amount * 100)`.
  - Sets `currency` matching workspace currency.
  - Backfills `status: 'Posted'`, `effectiveDate`, and `settledDate`.
  - Calculates invoice `totalAmountInCents`, `amountPaidInCents`, and `balanceDueInCents`.
  - Backfills project `budgetInCents`.
- Safe and idempotent to execute against existing production or staging databases:
  ```bash
  node server/src/migrations/phase2_financial_migration.js
  ```

## Verification & Test Results
- **22 total backend tests passed** (`npm --prefix server test`):
  - 15 Phase 1 tests (API & session hardening)
  - 7 Phase 2 tests (exact cent arithmetic, invoice lifecycle, overpayment prevention, concurrency locks, audited reversals, idempotency replay, cash vs. accrual semantics, and migration backfills).
- **4 client session tests passed** (`npm --prefix client test`).

