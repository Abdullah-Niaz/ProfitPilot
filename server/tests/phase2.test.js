import { initializeReplicaSet } from './replicaSet.js';
import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import Client from '../src/models/Client.js';
import Project from '../src/models/Project.js';
import Revenue from '../src/models/Revenue.js';
import Expense from '../src/models/Expense.js';
import Invoice from '../src/models/Invoice.js';
import Payment from '../src/models/Payment.js';
import AuditLog from '../src/models/AuditLog.js';
import IdempotencyKey from '../src/models/IdempotencyKey.js';
import {runFinancialMigration} from '../src/migrations/phase2_financial_migration.js';

process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET=randomBytes(48).toString('hex');

let mongo, server, folder, base, actor;
const password = randomBytes(18).toString('hex');

async function freePort() {
  const s = net.createServer();
  await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  const port = s.address().port;
  await new Promise(resolve => s.close(resolve));
  return port;
}

async function call(route, { actor: caller = actor, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(caller ? { Authorization: `Bearer ${caller.accessToken}`, 'x-workspace-id': caller.workspaceId } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  const json = await response.json();
  return { status: response.status, json, headers: response.headers };
}

before(async () => {
  const binary = process.env.MONGOD_BINARY || ['C:/Program Files/MongoDB/Server/9.0/bin/mongod.exe', 'C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe'].find(existsSync) || 'mongod';
  folder = await mkdtemp(path.join(os.tmpdir(), 'financial-crm-phase2-'));
  const port = await freePort();
  mongo = spawn(binary, ['--dbpath', folder, '--port', String(port), '--bind_ip', '127.0.0.1', '--noauth', '--replSet', 'crmTest'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let mongoLog = '';
  for (const stream of [mongo.stdout, mongo.stderr]) stream.on('data', chunk => { mongoLog = (mongoLog + chunk).slice(-6000); });
  console.log('Starting isolated MongoDB test database for Phase 2');
  let startupError;
  mongo.on('error', e => { startupError = e; });
  for (let i = 0; i < 40; i++) {
    if (startupError) throw startupError;
    if (mongo.exitCode !== null) throw new Error('Test MongoDB stopped: ' + mongoLog);
    try {
      await mongoose.connect(`mongodb://127.0.0.1:${port}/phase2_test?directConnection=true`, { serverSelectionTimeoutMS: 500 });
      break;
    } catch (e) {
      if (i === 39) throw e;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  console.log('Phase 2 Test MongoDB connected');
  await initializeReplicaSet(port);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;

  const reg = await call('/auth/register', {
    caller: null,
    method: 'POST',
    body: { name: 'Finance Lead', email: `lead-${randomBytes(4).toString('hex')}@agency.example`, password }
  });
  assert.equal(reg.status, 201);
  actor = reg.json.data;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo && mongo.exitCode === null) {
    const exit = new Promise(resolve => mongo.once('exit', resolve));
    mongo.kill();
    await exit;
  }
  if (folder && path.dirname(path.resolve(folder)) === path.resolve(os.tmpdir()) && path.basename(folder).startsWith('financial-crm-phase2-')) {
    await rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('Exact money and currency rules: minor unit cents avoid IEEE 754 float drift', async () => {
  const c = await call('/clients', { method: 'POST', body: { name: 'Precision Corp' } });
  assert.equal(c.status, 201);
  const clientId = c.json.data._id;

  // Post 3 revenues that classically fail binary float addition: 0.10 + 0.20
  const r1 = await call('/revenue', { method: 'POST', body: { client: clientId, amount: 0.10, type: 'One-Time Payment' } });
  const r2 = await call('/revenue', { method: 'POST', body: { client: clientId, amount: 0.20, type: 'One-Time Payment' } });
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);
  assert.equal(r1.json.data.amountInCents, 10);
  assert.equal(r2.json.data.amountInCents, 20);

  // Mismatched currency is rejected
  const badCurrency = await call('/revenue', { method: 'POST', body: { client: clientId, amount: 50, currency: 'EUR', type: 'One-Time Payment' } });
  assert.equal(badCurrency.status, 400);

  // Fractional cents (>2 decimal places) rejected
  const badFraction = await call('/revenue', { method: 'POST', body: { client: clientId, amount: 10.005, type: 'One-Time Payment' } });
  assert.equal(badFraction.status, 400);

  // Aggregation overview calculates exact 0.30, not 0.30000000000000004
  const overview = await call('/analytics/overview');
  assert.equal(overview.status, 200);
  assert.equal(overview.json.data.totalRevenue, 0.30);
  assert.equal(overview.json.data.totalRevenueInCents, 30);
});

test('Invoice and payment lifecycle: prevents paying drafts, tracks balance, and blocks overpayment', async () => {
  const c = await call('/clients', { method: 'POST', body: { name: 'Invoice Client' } });
  const clientId = c.json.data._id;

  // 1. Create Invoice in Draft ($1000.00)
  const inv = await call('/invoices', {
    method: 'POST',
    body: {
      client: clientId,
      totalAmount: 1000,
      invoiceNo: `INV-TEST-${randomBytes(3).toString('hex')}`
    }
  });
  assert.equal(inv.status, 201);
  const invoiceId = inv.json.data._id;
  assert.equal(inv.json.data.status, 'Draft');
  assert.equal(inv.json.data.balanceDueInCents, 100000);

  // 2. Paying a Draft invoice is forbidden
  const earlyPay = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 200 }
  });
  assert.equal(earlyPay.status, 400);

  // 3. Send invoice
  const sent = await call(`/invoices/${invoiceId}/send`, { method: 'POST' });
  assert.equal(sent.status, 200);
  assert.equal(sent.json.data.status, 'Sent');

  // 4. Overpayment check: payment larger than balance due is rejected
  const overpay = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 1500 }
  });
  assert.equal(overpay.status, 409);

  // 5. Partial payment: $400.00
  const pay1 = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 400, paymentMethod: 'Bank Transfer' }
  });
  assert.equal(pay1.status, 201);
  assert.equal(pay1.json.data.invoice.status, 'Partially Paid');
  assert.equal(pay1.json.data.invoice.amountPaidInCents, 40000);
  assert.equal(pay1.json.data.invoice.balanceDueInCents, 60000);

  // 6. Complete remaining payment: $600.00
  const pay2 = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 600, paymentMethod: 'Stripe' }
  });
  assert.equal(pay2.status, 201);
  assert.equal(pay2.json.data.invoice.status, 'Paid');
  assert.equal(pay2.json.data.invoice.balanceDueInCents, 0);
  assert.equal(pay2.json.data.invoice.amountPaidInCents, 100000);

  // 7. Further payments to paid invoice are rejected
  const payExcess = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 10 }
  });
  assert.equal(payExcess.status, 409);
});

test('Concurrent payment requests cannot create negative balance or overpayment', async () => {
  const c = await call('/clients', { method: 'POST', body: { name: 'Concurrency Client' } });
  const inv = await call('/invoices', {
    method: 'POST',
    body: {
      client: c.json.data._id,
      totalAmount: 100,
      invoiceNo: `INV-CONCUR-${randomBytes(3).toString('hex')}`
    }
  });
  await call(`/invoices/${inv.json.data._id}/send`, { method: 'POST' });

  // Two concurrent payments of $80 each competing for a $100 invoice
  const [res1, res2] = await Promise.all([
    call('/payments', { method: 'POST', body: { invoice: inv.json.data._id, amount: 80 } }),
    call('/payments', { method: 'POST', body: { invoice: inv.json.data._id, amount: 80 } })
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(statuses, [201, 409]);

  // Invoice in DB must have exactly $80 paid and $20 remaining, never negative
  const verified = await Invoice.findById(inv.json.data._id);
  assert.equal(verified.amountPaidInCents, 8000);
  assert.equal(verified.balanceDueInCents, 2000);
  assert.equal(verified.status, 'Partially Paid');
});

test('Audited reversals: reversing payment restores invoice balance, marks ledger, and logs audit event', async () => {
  const c = await call('/clients', { method: 'POST', body: { name: 'Reversal Client' } });
  const inv = await call('/invoices', {
    method: 'POST',
    body: { client: c.json.data._id, totalAmount: 500, invoiceNo: `INV-REV-${randomBytes(3).toString('hex')}` }
  });
  await call(`/invoices/${inv.json.data._id}/send`, { method: 'POST' });

  const p = await call('/payments', { method: 'POST', body: { invoice: inv.json.data._id, amount: 500 } });
  assert.equal(p.status, 201);
  const paymentId = p.json.data.payment._id;

  const invPaid = await Invoice.findById(inv.json.data._id);
  assert.equal(invPaid.status, 'Paid');

  // Hard delete on payment is forbidden
  const del = await call(`/payments/${paymentId}`, { method: 'DELETE' });
  assert.equal(del.status, 409);

  // Reverse the payment
  const rev = await call(`/payments/${paymentId}/reverse`, {
    method: 'POST',
    body: { reason: 'Client refund due to canceled milestone' }
  });
  assert.equal(rev.status, 200);
  assert.equal(rev.json.data.status, 'Reversed');

  // Double reversal is rejected
  const doubleRev = await call(`/payments/${paymentId}/reverse`, {
    method: 'POST',
    body: { reason: 'Attempt duplicate reversal' }
  });
  assert.equal(doubleRev.status, 409);

  // Invoice balance restored to 500 and status back to Sent
  const invRestored = await Invoice.findById(inv.json.data._id);
  assert.equal(invRestored.status, 'Sent');
  assert.equal(invRestored.amountPaidInCents, 0);
  assert.equal(invRestored.balanceDueInCents, 50000);

  // Audit log was recorded
  const audit = await AuditLog.findOne({ entityId: paymentId, action: 'REVERSE_PAYMENT' });
  assert.ok(audit);
  assert.equal(audit.metadata.reason, 'Client refund due to canceled milestone');
  assert.equal(audit.metadata.amountInCents, 50000);
});

test('Idempotency middleware: prevents duplicate financial transactions and handles key reuse', async () => {
  const c = await call('/clients', { method: 'POST', body: { name: 'Idempotency Client' } });
  const key = `idem-${randomBytes(8).toString('hex')}`;

  const payload = { client: c.json.data._id, amount: 250, type: 'One-Time Payment' };

  // First request
  const first = await call('/revenue', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': key }
  });
  assert.equal(first.status, 201);
  const originalId = first.json.data._id;

  // Immediate retry with identical key & body returns cached response with replay indicator
  const second = await call('/revenue', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': key }
  });
  assert.equal(second.status, 201);
  assert.equal(second.json.data._id, originalId);
  assert.equal(second.headers.get('x-idempotent-replay'), 'true');

  // Verify database contains only 1 record, not 2
  const count = await Revenue.countDocuments({ workspace: actor.workspaceId, client: c.json.data._id });
  assert.equal(count, 1);

  // Reusing same idempotency key with a changed body is rejected with 422
  const altered = await call('/revenue', {
    method: 'POST',
    body: { client: c.json.data._id, amount: 999, type: 'One-Time Payment' },
    headers: { 'Idempotency-Key': key }
  });
  assert.equal(altered.status, 422);
});

test('Date semantics: cash vs accrual basis reporting in analytics overview', async () => {
  const c = await call('/clients', { method: 'POST', body: { name: 'Date Semantics Client' } });
  const clientId = c.json.data._id;

  // Earned revenue (accrual) but payment pending (not yet cash)
  await call('/revenue', {
    method: 'POST',
    body: {
      client: clientId,
      amount: 300,
      type: 'Monthly Retainer',
      paymentStatus: 'Pending',
      date: new Date('2026-11-01T00:00:00Z').toISOString()
    }
  });

  // Settled cash revenue
  await call('/revenue', {
    method: 'POST',
    body: {
      client: clientId,
      amount: 700,
      type: 'One-Time Payment',
      paymentStatus: 'Paid',
      date: new Date('2026-11-02T00:00:00Z').toISOString()
    }
  });

  // Cash basis query should only count the Paid revenue (700)
  const cashRep = await call('/analytics/overview?basis=cash');
  assert.equal(cashRep.status, 200);

  // Accrual basis query should count all active revenue (300 + 700 = 1000)
  const accrualRep = await call('/analytics/overview?basis=accrual');
  assert.equal(accrualRep.status, 200);
  assert.ok(accrualRep.json.data.totalRevenue >= cashRep.json.data.totalRevenue);
});

test('Data conversion migration: backfills legacy documents safely and idempotently', async () => {
  // Create an un-migrated raw record using direct collection insert
  const rawRev = {
    workspace: new mongoose.Types.ObjectId(actor.workspaceId),
    client: new mongoose.Types.ObjectId(),
    amount: 123.45,
    type: 'One-Time Payment',
    paymentStatus: 'Paid',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const inserted = await mongoose.connection.collection('revenues').insertOne(rawRev);

  // Run migration
  const stats = await runFinancialMigration();
  assert.ok(stats.revenuesMigrated >= 1);

  // Verify backfilled fields
  const updated = await Revenue.findById(inserted.insertedId);
  assert.equal(updated.amountInCents, 12345);
  assert.equal(updated.currency, 'USD');
  assert.equal(updated.status, 'Posted');
  assert.ok(updated.effectiveDate);
  assert.ok(updated.settledDate);
});


async function financialFixture(amount = 100) {
  const client = await call('/clients', { method: 'POST', body: { name: 'Reliability fixture' } });
  assert.equal(client.status, 201);
  const invoice = await call('/invoices', { method: 'POST',
    body: { client: client.json.data._id, amount } });
  assert.equal(invoice.status, 201, JSON.stringify(invoice.json));
  const sent = await call('/invoices/' + invoice.json.data._id + '/send', { method: 'POST' });
  assert.equal(sent.status, 200);
  return { client: client.json.data, invoice: invoice.json.data };
}

test('draft editing recalculates line totals, rejects mismatches and locks sent invoices', async () => {
  const client = await call('/clients', { method: 'POST', body: { name: 'Line items client' } });
  const created = await call('/invoices', { method: 'POST', body: {
    client: client.json.data._id, lineItems: [{ description: 'Design', quantity: 2, unitPrice: 12.34 }]
  } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const id = created.json.data._id;
  assert.equal(created.json.data.totalAmountInCents, 2468);
  const updated = await call('/invoices/' + id, { method: 'PATCH', body: {
    lineItems: [{ description: 'Design', quantity: 3, unitPrice: 12.34 }]
  } });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  assert.equal(updated.json.data.totalAmountInCents, 3702);
  assert.equal(updated.json.data.balanceDueInCents, 3702);
  assert.equal(updated.json.data.lineItems[0].amountInCents, 3702);
  const mismatch = await call('/invoices/' + id, { method: 'PATCH', body: { totalAmount: 1 } });
  assert.equal(mismatch.status, 400);
  const note = await call('/invoices/' + id, { method: 'PATCH', body: { notes: 'Reviewed' } });
  assert.equal(note.status, 200);
  assert.equal(note.json.data.totalAmountInCents, 3702);
  await call('/invoices/' + id + '/send', { method: 'POST' });
  assert.equal((await call('/invoices/' + id, { method: 'PATCH', body: { notes: 'Changed' } })).status, 409);
  const log = await AuditLog.findOne({ entityId: id, action: 'UPDATE_INVOICE' });
  assert.ok(log.actor);
  assert.equal(String(log.actor), String(actor.user.id));
});

test('audit failure rolls back payment, revenue, invoice balance and idempotency reservation', async () => {
  const { invoice } = await financialFixture();
  const key = randomBytes(16).toString('hex');
  const body = { invoice: invoice._id, amount: 40 };
  const originalCreate = AuditLog.create;
  let failed;
  try {
    AuditLog.create = async () => { throw new Error('Injected audit storage failure'); };
    failed = await call('/payments', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
  } finally {
    AuditLog.create = originalCreate;
  }
  assert.equal(failed.status, 500);
  const unchanged = await Invoice.findById(invoice._id);
  assert.equal(unchanged.amountPaidInCents, 0);
  assert.equal(unchanged.balanceDueInCents, 10000);
  assert.equal(await Payment.countDocuments({ invoice: invoice._id }), 0);
  assert.equal(await Revenue.countDocuments({ invoice: invoice._id }), 0);
  assert.equal(await IdempotencyKey.countDocuments({ key }), 0);
  const retried = await call('/payments', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
  assert.equal(retried.status, 201);
  const log = await AuditLog.findOne({ entityId: retried.json.data.payment._id, action: 'POST_PAYMENT' });
  assert.equal(String(log.actor), String(actor.user.id));
});

test('simultaneous reversals restore the balance exactly once', async () => {
  const { invoice } = await financialFixture();
  const paid = await call('/payments', { method: 'POST', body: { invoice: invoice._id, amount: 40 } });
  assert.equal(paid.status, 201);
  const id = paid.json.data.payment._id;
  const responses = await Promise.all([1, 2].map(() => call('/payments/' + id + '/reverse', {
    method: 'POST', body: { reason: 'Duplicate transfer correction' }
  })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const restored = await Invoice.findById(invoice._id);
  assert.equal(restored.amountPaidInCents, 0);
  assert.equal(restored.balanceDueInCents, 10000);
  assert.equal(restored.status, 'Sent');
  assert.equal(await AuditLog.countDocuments({ entityId: id, action: 'REVERSE_PAYMENT' }), 1);
  const payment = await Payment.findById(id);
  assert.equal(String(payment.reversedBy), String(actor.user.id));
});

test('simultaneous idempotent payments persist one committed response and one payment', async () => {
  const { invoice } = await financialFixture();
  const key = randomBytes(16).toString('hex');
  const options = { method: 'POST', body: { invoice: invoice._id, amount: 30 }, headers: { 'Idempotency-Key': key } };
  const responses = await Promise.all([call('/payments', options), call('/payments', options)]);
  assert.deepEqual(responses.map(r => r.status), [201, 201]);
  assert.equal(responses[0].json.data.payment._id, responses[1].json.data.payment._id);
  assert.equal(await Payment.countDocuments({ invoice: invoice._id }), 1);
  assert.equal((await Invoice.findById(invoice._id)).amountPaidInCents, 3000);
  const saved = await IdempotencyKey.findOne({ key });
  assert.equal(saved.status, 'completed');
  assert.equal(saved.responseBody.data.payment._id, responses[0].json.data.payment._id);
});

test('invoice payments reject unrelated projects and posted entries reject reassignment', async () => {
  const { client, invoice } = await financialFixture();
  const bad = await call('/payments', { method: 'POST', body: {
    invoice: invoice._id, amount: 10, project: new mongoose.Types.ObjectId().toString()
  } });
  assert.equal(bad.status, 400);
  assert.equal((await Invoice.findById(invoice._id)).amountPaidInCents, 0);
  const paid = await call('/payments', { method: 'POST', body: { invoice: invoice._id, amount: 10 } });
  assert.equal(paid.status, 201);
  const edited = await call('/revenue/' + paid.json.data.revenue._id, {
    method: 'PATCH', body: { client: client._id, paymentStatus: 'Pending' }
  });
  assert.equal(edited.status, 409);
});

test('a concurrent void and payment cannot leave a paid void invoice', async () => {
  const { invoice } = await financialFixture();
  const results = await Promise.all([
    call('/invoices/' + invoice._id + '/void', { method: 'POST', body: { reason: 'Cancelled service' } }),
    call('/payments', { method: 'POST', body: { invoice: invoice._id, amount: 100 } })
  ]);
  assert.equal(results.filter(r => r.status >= 200 && r.status < 300).length, 1);
  const saved = await Invoice.findById(invoice._id);
  if (saved.status === 'Void') {
    assert.equal(saved.amountPaidInCents, 0);
    assert.equal(await Payment.countDocuments({ invoice: invoice._id }), 0);
  } else {
    assert.equal(saved.status, 'Paid');
    assert.equal(saved.balanceDueInCents, 0);
    assert.equal(await Payment.countDocuments({ invoice: invoice._id }), 1);
  }
});

test('legacy invoice migration preserves paid balances and workspace currency without schema defaults', async () => {
  const workspace = await Workspace.create({ name: 'Migration workspace', owner: actor.user.id, currency: 'GBP' });
  const inserted = await Invoice.collection.insertOne({
    workspace: workspace._id, client: new mongoose.Types.ObjectId(), invoiceNo: 'LEGACY-PAID',
    amount: 100, amountPaid: 40, status: 'Partially Paid'
  });
  await runFinancialMigration();
  const saved = await Invoice.findById(inserted.insertedId).lean();
  assert.equal(saved.currency, 'GBP');
  assert.equal(saved.totalAmountInCents, 10000);
  assert.equal(saved.amountPaidInCents, 4000);
  assert.equal(saved.balanceDueInCents, 6000);
  const again = await runFinancialMigration();
  assert.equal(again.invoicesMigrated, 0);
});
