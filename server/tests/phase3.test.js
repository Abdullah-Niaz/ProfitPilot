import MailJob from '../src/models/MailJob.js';
import {deliverNext} from '../src/services/mail.service.js';
import {sharedRateLimit} from '../src/middlewares/rateLimit.middleware.js';
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
import WorkspaceMember from '../src/models/WorkspaceMember.js';
import AuthSession from '../src/models/AuthSession.js';

process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET=randomBytes(48).toString('hex');

let mongo, server, folder, base, ownerActor;
const password = randomBytes(18).toString('hex');

async function freePort() {
  const s = net.createServer();
  await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  const port = s.address().port;
  await new Promise(resolve => s.close(resolve));
  return port;
}

async function call(route, { actor = ownerActor, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(actor ? { Authorization: `Bearer ${actor.accessToken}`, 'x-workspace-id': actor.workspaceId } : {}),
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
  folder = await mkdtemp(path.join(os.tmpdir(), 'financial-crm-phase3-'));
  const port = await freePort();
  mongo = spawn(binary, ['--dbpath', folder, '--port', String(port), '--bind_ip', '127.0.0.1', '--noauth', '--replSet', 'crmTest'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let mongoLog = '';
  for (const stream of [mongo.stdout, mongo.stderr]) stream.on('data', chunk => { mongoLog = (mongoLog + chunk).slice(-6000); });
  console.log('Starting isolated MongoDB test database for Phase 3');
  let startupError;
  mongo.on('error', e => { startupError = e; });
  for (let i = 0; i < 40; i++) {
    if (startupError) throw startupError;
    if (mongo.exitCode !== null) throw new Error('Test MongoDB stopped: ' + mongoLog);
    try {
      await mongoose.connect(`mongodb://127.0.0.1:${port}/phase3_test?directConnection=true`, { serverSelectionTimeoutMS: 500 });
      break;
    } catch (e) {
      if (i === 39) throw e;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  console.log('Phase 3 Test MongoDB connected');
  await initializeReplicaSet(port);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;

  const reg = await call('/auth/register', {
    actor: null,
    method: 'POST',
    body: { name: 'Agency Owner', email: `owner-${randomBytes(4).toString('hex')}@agency.example`, password }
  });
  assert.equal(reg.status, 201);
  ownerActor = reg.json.data;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo && mongo.exitCode === null) {
    const exit = new Promise(resolve => mongo.once('exit', resolve));
    mongo.kill();
    await exit;
  }
  if (folder && path.dirname(path.resolve(folder)) === path.resolve(os.tmpdir()) && path.basename(folder).startsWith('financial-crm-phase3-')) {
    await rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('Account recovery: forgot-password and reset-password workflow', async () => {
  const email = ownerActor.user.email;
  const newPassword = randomBytes(18).toString('hex');

  // 1. Request password recovery
  const reqReset = await call('/auth/forgot-password', {
    actor: null,
    method: 'POST',
    body: { email }
  });
  assert.equal(reqReset.status, 200);
  const token = reqReset.json.data.resetToken;
  assert.ok(token);

  // 2. Reset password using token
  const doReset = await call('/auth/reset-password', {
    actor: null,
    method: 'POST',
    body: { email, token, newPassword }
  });
  assert.equal(doReset.status, 200);

  // 3. Old password fails
  const oldLogin = await call('/auth/login', {
    actor: null,
    method: 'POST',
    body: { email, password }
  });
  assert.equal(oldLogin.status, 401);

  // 4. New password succeeds
  const newLogin = await call('/auth/login', {
    actor: null,
    method: 'POST',
    body: { email, password: newPassword }
  });
  assert.equal(newLogin.status, 200);
  assert.ok(newLogin.json.data.accessToken);
  ownerActor = { ...ownerActor, accessToken: newLogin.json.data.accessToken };
});

test('Team invitations and workspace member management', async () => {
  const inviteEmail = `colleague-${randomBytes(4).toString('hex')}@agency.example`;

  // 1. Owner invites new member
  const inviteRes = await call('/workspaces/current/invitations', {
    method: 'POST',
    body: { email: inviteEmail, role: 'Accountant' }
  });
  assert.equal(inviteRes.status, 201);
  assert.equal(inviteRes.json.data.role, 'Accountant');
  assert.equal(inviteRes.json.data.status, 'invited');

  // 2. Members list includes the invited member
  const listRes = await call('/workspaces/current/members');
  assert.equal(listRes.status, 200);
  const found = listRes.json.data.find(m => m.user?.email === inviteEmail);
  assert.ok(found);
  assert.equal(found.role, 'Accountant');

  // 3. Re-inviting existing member updates role without duplicate error
  const reInvite = await call('/workspaces/current/invitations', {
    method: 'POST',
    body: { email: inviteEmail, role: 'Manager' }
  });
  assert.equal(reInvite.status, 200);
  assert.equal(reInvite.json.data.role, 'Manager');
});

test('End-to-end MVP primary user journey: Client -> Project -> Invoice -> Payment -> Profitability', async () => {
  // 1. Create client
  const clientRes = await call('/clients', {
    method: 'POST',
    body: { name: 'Full Journey Client', industry: 'FinTech', status: 'Active' }
  });
  assert.equal(clientRes.status, 201);
  const clientId = clientRes.json.data._id;

  // 2. Create project
  const projectRes = await call('/projects', {
    method: 'POST',
    body: { name: 'E2E Onboarding', client: clientId, budget: 10000, status: 'Active' }
  });
  assert.equal(projectRes.status, 201);
  const projectId = projectRes.json.data._id;

  // 3. Issue and send invoice
  const invRes = await call('/invoices', {
    method: 'POST',
    body: { client: clientId, project: projectId, totalAmount: 5000 }
  });
  assert.equal(invRes.status, 201);
  const invoiceId = invRes.json.data._id;

  const sendRes = await call(`/invoices/${invoiceId}/send`, { method: 'POST' });
  assert.equal(sendRes.status, 200);
  assert.equal(sendRes.json.data.status, 'Sent');

  // 4. Pay invoice
  const payRes = await call('/payments', {
    method: 'POST',
    body: { invoice: invoiceId, amount: 5000, paymentMethod: 'Stripe' }
  });
  assert.equal(payRes.status, 201);
  assert.equal(payRes.json.data.invoice.status, 'Paid');

  // 5. Check client profitability reflects recorded revenue
  const profRes = await call(`/clients/${clientId}/profitability`);
  assert.equal(profRes.status, 200);
  assert.equal(profRes.json.data.revenue, 5000);
  assert.equal(profRes.json.data.profit, 5000);
  assert.equal(profRes.json.data.margin, 100);
});

test('invitation acceptance creates an active session and rejects reused or removed invitations',async()=>{
  const email='invite-'+randomBytes(4).toString('hex')+'@agency.example';
  const invitation=await call('/workspaces/current/invitations',{method:'POST',body:{email,role:'Accountant'}});
  assert.equal(invitation.status,201);
  const mail=await MailJob.findOne({to:email}).sort({createdAt:-1});
  const token=new URLSearchParams(new URL(mail.text.split('\n\n')[1]).hash.slice(1)).get('token');
  const accepted=await call('/auth/accept-invitation',{actor:null,method:'POST',body:{token,newPassword:password}});
  assert.equal(accepted.status,200,JSON.stringify(accepted.json));
  assert.equal(accepted.json.data.role,'Accountant');
  assert.equal((await call('/clients',{actor:accepted.json.data})).status,200);
  assert.equal((await call('/auth/accept-invitation',{actor:null,method:'POST',body:{token,newPassword:password}})).status,400);
  const removedEmail='removed-'+randomBytes(4).toString('hex')+'@agency.example';
  const removed=await call('/workspaces/current/invitations',{method:'POST',body:{email:removedEmail,role:'Team Member'}});
  const removedMail=await MailJob.findOne({to:removedEmail});
  const removedToken=new URLSearchParams(new URL(removedMail.text.split('\n\n')[1]).hash.slice(1)).get('token');
  assert.equal((await call('/workspaces/current/members/'+removed.json.data._id,{method:'DELETE'})).status,200);
  assert.equal((await call('/auth/accept-invitation',{actor:null,method:'POST',body:{token:removedToken,newPassword:password}})).status,400);
});

test('verification token is one-use and email delivery uses a stable provider key',async()=>{
  const request=await call('/auth/request-verification',{method:'POST'});
  assert.equal(request.status,200);
  const user=await User.findById(ownerActor.user.id);
  const mail=await MailJob.findOne({to:user.email,subject:'Verify your email'}).sort({createdAt:-1});
  assert.ok(mail);
  const token=new URLSearchParams(new URL(mail.text.split('\n\n')[1]).hash.slice(1)).get('token');
  assert.equal((await call('/auth/verify-email',{actor:null,method:'POST',body:{token}})).status,200);
  assert.equal((await User.findById(user._id)).isEmailVerified,true);
  assert.equal((await call('/auth/verify-email',{actor:null,method:'POST',body:{token}})).status,400);
  // Mock transport: this test never sends email.
  const oldKey=process.env.RESEND_API_KEY,oldFrom=process.env.MAIL_FROM;
  process.env.RESEND_API_KEY='test-only';process.env.MAIL_FROM='test@example.test';
  try{
    let key;
    assert.equal(await deliverNext(async(url,options)=>{
      assert.equal(url,'https://api.resend.com/emails');
      key=options.headers['Idempotency-Key'];
      return {ok:true,json:async()=>({id:'mock-provider-id'})};
    }),true);
    assert.ok(key.startsWith('crm-mail-'));
    assert.ok(await MailJob.exists({providerId:'mock-provider-id',status:'sent'}));
  }finally{
    if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey;
    if(oldFrom===undefined)delete process.env.MAIL_FROM;else process.env.MAIL_FROM=oldFrom;
  }
});

test('rate limits are shared by independent middleware instances',async()=>{
  const options={namespace:'test-'+randomBytes(5).toString('hex'),windowMs:60000,max:2};
  const first=sharedRateLimit(options),second=sharedRateLimit(options);
  const request={ip:'192.0.2.4',path:'/test'};
  let status=200,advanced=0;
  const response={setHeader(){},status(code){status=code;return this;},json(){return this;}};
  const next=error=>{if(error)throw error;advanced++;};
  await first(request,response,next);await second(request,response,next);await first(request,response,next);
  assert.equal(advanced,2);assert.equal(status,429);
});
