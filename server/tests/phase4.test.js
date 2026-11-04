import { initializeReplicaSet } from './replicaSet.js';
import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
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
import {backupDatabase} from '../src/scripts/backup.js';
import {restoreDatabase} from '../src/scripts/restore.js';

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
  return { status: response.status, json };
}

before(async () => {
  const binary = process.env.MONGOD_BINARY || ['C:/Program Files/MongoDB/Server/9.0/bin/mongod.exe', 'C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe'].find(existsSync) || 'mongod';
  folder = await mkdtemp(path.join(os.tmpdir(), 'financial-crm-phase4-'));
  const port = await freePort();
  mongo = spawn(binary, ['--dbpath', folder, '--port', String(port), '--bind_ip', '127.0.0.1', '--noauth', '--replSet', 'crmTest'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let mongoLog = '';
  for (const stream of [mongo.stdout, mongo.stderr]) stream.on('data', chunk => { mongoLog = (mongoLog + chunk).slice(-6000); });
  console.log('Starting isolated MongoDB test database for Phase 4');
  let startupError;
  mongo.on('error', e => { startupError = e; });
  for (let i = 0; i < 40; i++) {
    if (startupError) throw startupError;
    if (mongo.exitCode !== null) throw new Error('Test MongoDB stopped: ' + mongoLog);
    try {
      await mongoose.connect(`mongodb://127.0.0.1:${port}/phase4_test?directConnection=true`, { serverSelectionTimeoutMS: 500 });
      break;
    } catch (e) {
      if (i === 39) throw e;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  console.log('Phase 4 Test MongoDB connected');
  await initializeReplicaSet(port);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;

  const reg = await call('/auth/register', {
    actor: null,
    method: 'POST',
    body: { name: 'Ops Director', email: `ops-${randomBytes(4).toString('hex')}@agency.example`, password }
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
  if (folder && path.dirname(path.resolve(folder)) === path.resolve(os.tmpdir()) && path.basename(folder).startsWith('financial-crm-phase4-')) {
    await rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('Monitoring & Health check telemetry endpoint', async () => {
  const res = await call('/health', { actor: null });
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.equal(res.json.data.status, 'healthy');
  assert.equal(res.json.data.database, 'connected');
  assert.ok(typeof res.json.data.uptime === 'number');
  assert.ok(res.json.data.memoryUsage.rssMb > 0);
});

test('Clean-environment setup and backup restoration exercise', async () => {
  // 1. Seed realistic fixture data
  const clientRes = await call('/clients', {
    method: 'POST',
    body: { name: 'Disaster Recovery Client', industry: 'HealthTech' }
  });
  const clientId = clientRes.json.data._id;

  const projectRes = await call('/projects', {
    method: 'POST',
    body: { name: 'Platform Migration', client: clientId, budget: 15000 }
  });
  const projectId = projectRes.json.data._id;

  const invRes = await call('/invoices', {
    method: 'POST',
    body: { client: clientId, project: projectId, totalAmount: 7500, invoiceNo: `INV-DR-${Date.now()}` }
  });
  const invoiceId = invRes.json.data._id;
  await call(`/invoices/${invoiceId}/send`, { method: 'POST' });

  const payment = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 7500, paymentMethod: 'Bank Transfer' }
  });
  assert.equal(payment.status, 201, JSON.stringify(payment.json));

  await call('/expenses', {
    method: 'POST',
    body: { client: clientId, project: projectId, amount: 2000, category: 'Hosting' }
  });

  // Check baseline financial state
  const baseline = await call('/analytics/overview');
  assert.equal(baseline.status, 200);
  const originalRevenue = baseline.json.data.totalRevenueInCents;
  const originalExpenses = baseline.json.data.totalExpensesInCents;
  assert.ok(originalRevenue >= 750000);
  assert.ok(originalExpenses >= 200000);

  // 2. Perform automated database backup
  const backupFolder = await mkdtemp(path.join(os.tmpdir(), 'crm-backup-test-'));
  const manifest = await backupDatabase(backupFolder);
  assert.ok(manifest.collections['invoices'].count >= 1);
  assert.ok(manifest.collections['payments'].count >= 1);
  assert.ok(manifest.collections['clients'].count >= 1);

  // 3. Simulate disaster: Wipe all operational collections
  await Promise.all([
    Client.deleteMany({}),
    Project.deleteMany({}),
    Invoice.deleteMany({}),
    Payment.deleteMany({}),
    Revenue.deleteMany({}),
    Expense.deleteMany({})
  ]);

  // Verify wipe
  assert.equal(await Client.countDocuments({}), 0);
  assert.equal(await Invoice.countDocuments({}), 0);
  assert.equal(await Payment.countDocuments({}), 0);

  // 4. Perform database restoration
  const restoreReport = await restoreDatabase(backupFolder, { replaceDatabase: mongoose.connection.name });
  assert.ok(restoreReport.collectionsRestored['clients'].verified);
  assert.ok(restoreReport.collectionsRestored['invoices'].verified);
  assert.ok(restoreReport.collectionsRestored['payments'].verified);

  // 5. Verify restored state reconciles to exact baseline
  const postRestore = await call('/analytics/overview');
  assert.equal(postRestore.status, 200);
  assert.equal(postRestore.json.data.totalRevenueInCents, originalRevenue);
  assert.equal(postRestore.json.data.totalExpensesInCents, originalExpenses);
  assert.equal(postRestore.json.data.netProfitInCents, originalRevenue - originalExpenses);

  // Verify invoice status after restore
  const restoredInvoice = await Invoice.findById(invoiceId);
  assert.ok(restoredInvoice);
  assert.equal(restoredInvoice.status, 'Paid');
  assert.equal(restoredInvoice.balanceDueInCents, 0);

  // Clean up temporary backup directory
  await rm(backupFolder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

test('Analytics smoke check reports timing and verifies financial indexes', async (t) => {
  const start = performance.now();
  const res = await call('/analytics/overview');
  const elapsed = performance.now() - start;
  assert.equal(res.status, 200);
  assert.ok(Number.isSafeInteger(res.json.data.totalRevenueInCents));
  assert.ok(Number.isSafeInteger(res.json.data.totalExpensesInCents));
  const indexes = await Invoice.collection.indexes();
  assert.ok(indexes.some(index => index.key.workspace === 1 && index.key.status === 1));
  t.diagnostic('Analytics response time: ' + elapsed.toFixed(1) + 'ms (local smoke test, not a load benchmark)');
  if (process.env.ANALYTICS_MAX_MS) {
    const budget = Number(process.env.ANALYTICS_MAX_MS);
    assert.ok(Number.isFinite(budget) && budget > 0, 'ANALYTICS_MAX_MS must be positive');
    assert.ok(elapsed < budget, 'Analytics response exceeded configured benchmark budget');
  }
});


test('backup preserves nested BSON values and refuses corrupted files before modifying data',async()=>{
  const db=mongoose.connection.db,collection=db.collection('bson_roundtrip');
  const objectId=new mongoose.Types.ObjectId(),stamp=new Date('2026-01-02T03:04:05Z');
  await collection.insertOne({_id:objectId,nested:{owner:objectId,dates:[stamp]},price:mongoose.mongo.Decimal128.fromString('123.4500')});
  await collection.createIndex({'nested.owner':1});
  const directory=await mkdtemp(path.join(os.tmpdir(),'crm-backup-test-'));
  try{
    const manifest=await backupDatabase(directory);
    await collection.deleteMany({});
    await restoreDatabase(directory,{replaceDatabase:db.databaseName});
    const saved=await collection.findOne({_id:objectId});
    assert.ok(saved.nested.owner.equals(objectId));
    assert.ok(saved.nested.dates[0] instanceof Date);
    assert.equal(saved.nested.dates[0].toISOString(),stamp.toISOString());
    assert.equal(saved.price.toString(),'123.4500');
    assert.ok((await collection.indexes()).some(index=>index.key['nested.owner']===1));
    const file=path.join(directory,manifest.collections.bson_roundtrip.file);
    await writeFile(file,'[]');
    await assert.rejects(restoreDatabase(directory,{replaceDatabase:db.databaseName}),/checksum/);
    assert.equal(await collection.countDocuments({_id:objectId}),1);
  }finally{
    if(path.dirname(path.resolve(directory))===path.resolve(os.tmpdir()) && path.basename(directory).startsWith('crm-backup-test-'))
      await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
});
