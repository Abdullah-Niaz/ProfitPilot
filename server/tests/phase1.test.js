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
import WorkspaceMember from '../src/models/WorkspaceMember.js';
import AuthSession from '../src/models/AuthSession.js';
import Client from '../src/models/Client.js';
import Project from '../src/models/Project.js';
import Revenue from '../src/models/Revenue.js';
import {signAccessToken} from '../src/utils/tokens.js';
import {assertSeedAllowed} from '../src/seed/guard.js';

process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET=randomBytes(48).toString('hex');
let mongo, server, folder, base, a, b, clientA, clientB, projectA, revenueA;
const password=randomBytes(18).toString('hex');
async function freePort(){const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
async function call(route,{actor,method='GET',body,headers={},cookie}={}) {
  const response=await fetch(base+route,{method,headers:{...(actor?{Authorization:`Bearer ${actor.accessToken}`,'x-workspace-id':actor.workspaceId}:{}),...((cookie||actor?.cookie)?{Cookie:cookie||actor.cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  const json=await response.json();
  return {status:response.status,json,cookie:response.headers.get('set-cookie')?.split(';')[0],cookieHeader:response.headers.get('set-cookie')};
}
async function createActor(name){const r=await call('/auth/register',{method:'POST',body:{name,email:`${name}-${randomBytes(4).toString('hex')}@example.com`,password}});assert.equal(r.status,201,JSON.stringify(r.json));return {...r.json.data,cookie:r.cookie};}
before(async()=>{
  const binary=process.env.MONGOD_BINARY || ['C:/Program Files/MongoDB/Server/9.0/bin/mongod.exe','C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe'].find(existsSync) || 'mongod';
  folder=await mkdtemp(path.join(os.tmpdir(),'financial-crm-phase1-'));
  const port=await freePort();
  mongo=spawn(binary,['--dbpath',folder,'--port',String(port),'--bind_ip','127.0.0.1','--noauth', '--replSet', 'crmTest'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let mongoLog='';
  for(const stream of [mongo.stdout,mongo.stderr]) stream.on('data',chunk=>{mongoLog=(mongoLog+chunk).slice(-6000);});
  console.log('Starting isolated MongoDB test database');
  let startupError; mongo.on('error',e=>{startupError=e;});
  for(let i=0;i<40;i++){
    if(startupError)throw startupError;
    if(mongo.exitCode!==null)throw new Error('Test MongoDB stopped: '+mongoLog);
    try{await mongoose.connect(`mongodb://127.0.0.1:${port}/phase1_test?directConnection=true`,{serverSelectionTimeoutMS:500});break;}catch(e){if(i===39)throw e;await new Promise(resolve=>setTimeout(resolve,200));}
  }
  console.log('Test MongoDB connected');
  await initializeReplicaSet(port);
  await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}/api`;
  a=await createActor('OwnerA');b=await createActor('OwnerB');
  const ca=await call('/clients',{actor:a,method:'POST',body:{name:'Client A'}});assert.equal(ca.status,201);clientA=ca.json.data;
  const cb=await call('/clients',{actor:b,method:'POST',body:{name:'Client B'}});assert.equal(cb.status,201);clientB=cb.json.data;
  const pa=await call('/projects',{actor:a,method:'POST',body:{name:'Project A',client:clientA._id,budget:500}});assert.equal(pa.status,201);projectA=pa.json.data;
  const revenue=await call('/revenue',{actor:a,method:'POST',body:{client:clientA._id,project:projectA._id,amount:100,type:'One-Time Payment'}});assert.equal(revenue.status,201);revenueA=revenue.json.data;
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  await mongoose.disconnect();
  if(mongo && mongo.exitCode===null){const exit=new Promise(resolve=>mongo.once('exit',resolve));mongo.kill();await exit;}
  // Delete only this test's freshly allocated directory under the OS temp folder.
  if(folder && path.dirname(path.resolve(folder))===path.resolve(os.tmpdir()) && path.basename(folder).startsWith('financial-crm-phase1-'))await rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:200});
});

test('invalid authentication and malformed IDs return errors without taking down API',async()=>{
  assert.equal((await call('/clients')).status,401);
  assert.equal((await call('/clients',{headers:{Authorization:'Bearer invalid'}})).status,401);
  const malformed=await call('/clients/not-an-id',{actor:a});assert.equal(malformed.status,400);assert.equal(malformed.json.stack,undefined);
  assert.equal((await call('/health')).status,200);
});
test('strict updates reject workspace reassignment, operators, negative money and invalid statuses',async()=>{
  for(const body of [{workspace:b.workspaceId},{'$set':{amount:-10}},{amount:-10},{paymentStatus:'anything'}])assert.equal((await call(`/revenue/${revenueA._id}`,{actor:a,method:'PATCH',body})).status,400);
  const saved=await Revenue.findById(revenueA._id);assert.equal(String(saved.workspace),a.workspaceId);assert.equal(saved.amount,100);
  assert.equal((await call('/workspaces/current',{actor:a,method:'PATCH',body:{owner:b.user.id}})).status,400);
});
test('foreign workspace records cannot be read, updated, deleted or scored',async()=>{
  for(const method of ['GET','PATCH','DELETE'])assert.equal((await call(`/clients/${clientB._id}`,{actor:a,method,body:method==='PATCH'?{name:'Changed'}:undefined})).status,404);
  assert.equal((await call(`/ai/client-recommendation/${clientB._id}`,{actor:a,method:'POST'})).status,404);
  assert.equal((await call(`/clients/${clientB._id}/profitability`,{actor:a})).status,404);
  assert.equal((await call('/clients',{actor:a,headers:{'x-workspace-id':b.workspaceId}})).status,403);
});
test('related clients, projects and assigned members must belong to the authorized workspace',async()=>{
  assert.equal((await call('/projects',{actor:a,method:'POST',body:{name:'Bad project',client:clientB._id}})).status,404);
  assert.equal((await call('/projects',{actor:a,method:'POST',body:{name:'Bad assignment',client:clientA._id,assignedMembers:[b.user.id]}})).status,400);
  const other=await call('/clients',{actor:a,method:'POST',body:{name:'Other A'}});
  assert.equal((await call('/expenses',{actor:a,method:'POST',body:{client:other.json.data._id,project:projectA._id,amount:5,category:'Operations'}})).status,400);
  assert.equal((await call(`/projects/${projectA._id}`,{actor:a,method:'PATCH',body:{client:other.json.data._id}})).status,409);
});
test('client listing works and historical foreign references are redacted during population',async()=>{
  const r=await call('/clients',{actor:a});assert.equal(r.status,200);assert.ok(r.json.data.some(item=>item.name==='Client A'));assert.ok(!r.json.data.some(item=>item.name==='Client B'));
  const legacy=await Project.create({workspace:a.workspaceId,client:clientB._id,name:'Historical invalid reference'});
  const view=await call(`/projects/${legacy._id}`,{actor:a});assert.equal(view.status,200);assert.equal(view.json.data.client,null);
});
test('expense chart aggregates ObjectIds within the workspace',async()=>{
  assert.equal((await call('/expenses',{actor:a,method:'POST',body:{client:clientA._id,amount:25,category:'Operations'}})).status,201);
  assert.equal((await call('/expenses',{actor:b,method:'POST',body:{client:clientB._id,amount:900,category:'Operations'}})).status,201);
  const chart=await call('/analytics/expense-breakdown',{actor:a});assert.equal(chart.status,200);assert.deepEqual(chart.json.data,[{name:'Operations',value:25}]);
});
test('linked records and financial entries cannot be hard deleted',async()=>{
  assert.equal((await call(`/clients/${clientA._id}`,{actor:a,method:'DELETE'})).status,409);
  assert.equal((await call(`/projects/${projectA._id}`,{actor:a,method:'DELETE'})).status,409);
  assert.equal((await call(`/revenue/${revenueA._id}`,{actor:a,method:'DELETE'})).status,409);
});
test('workspace currency cannot reinterpret existing budgets and amounts',async()=>{
  assert.equal((await call('/workspaces/current',{actor:a,method:'PATCH',body:{currency:'EUR'}})).status,409);
});
test('registration does not claim verification and refresh credentials are hashed and HttpOnly',async()=>{
  assert.equal(a.user.isEmailVerified,false);
  assert.equal(a.refreshToken,undefined);
  const session=await AuthSession.findOne({user:a.user.id}).select('+refreshHash');
  assert.match(session.refreshHash,/^[a-f0-9]{64}$/);assert.ok(!session.refreshHash.includes('eyJ'));
  const login=await call('/auth/login',{method:'POST',body:{email:a.user.email,password}});
  assert.match(login.cookieHeader,/HttpOnly/i);assert.match(login.cookieHeader,/SameSite=Lax/i);
});
test('refresh rotates atomically; reusing a token fails',async()=>{
  const login=await call('/auth/login',{method:'POST',body:{email:a.user.email,password}});
  const results=await Promise.all([1,2].map(()=>call('/auth/refresh-token',{method:'POST',cookie:login.cookie})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);
  const success=results.find(r=>r.status===200);assert.notEqual(success.cookie,login.cookie);
  assert.equal((await call('/auth/refresh-token',{method:'POST',cookie:login.cookie})).status,401);
  assert.equal((await call('/auth/refresh-token',{method:'POST',cookie:success.cookie})).status,200);
});
test('logout revokes access immediately and refresh cannot restore the session',async()=>{
  const login=await call('/auth/login',{method:'POST',body:{email:a.user.email,password}});
  const actor={...login.json.data,cookie:login.cookie};
  assert.equal((await call('/auth/logout',{actor,method:'POST'})).status,200);
  assert.equal((await call('/clients',{actor})).status,401);
  assert.equal((await call('/auth/refresh-token',{method:'POST',cookie:actor.cookie})).status,401);
});
test('expired tokens, foreign origins and removed membership are rejected',async()=>{
  const login=await call('/auth/login',{method:'POST',body:{email:b.user.email,password}});const actor={...login.json.data,cookie:login.cookie};
  const session=await AuthSession.findOne({user:b.user.id}).sort({createdAt:-1});
  const old=process.env.ACCESS_TOKEN_EXPIRES_IN;process.env.ACCESS_TOKEN_EXPIRES_IN='-1s';
  const expired=signAccessToken({userId:b.user.id,workspaceId:b.workspaceId,sid:String(session._id)});if(old)process.env.ACCESS_TOKEN_EXPIRES_IN=old;else delete process.env.ACCESS_TOKEN_EXPIRES_IN;
  assert.equal((await call('/clients',{actor:{...actor,accessToken:expired}})).status,401);
  assert.equal((await call('/auth/refresh-token',{method:'POST',cookie:actor.cookie,headers:{Origin:'https://untrusted.example'}})).status,403);
  await WorkspaceMember.updateOne({workspace:b.workspaceId,user:b.user.id},{$set:{status:'removed'}});
  assert.equal((await call('/clients',{actor})).status,403);
  assert.equal((await call('/auth/refresh-token',{method:'POST',cookie:actor.cookie})).status,401);
});
test('role checks protect writes even when the user can read',async()=>{
  const user=await User.create({name:'Reader',email:'reader@example.com',password});
  await WorkspaceMember.create({workspace:a.workspaceId,user:user._id,role:'Team Member',status:'active'});
  const login=await call('/auth/login',{method:'POST',body:{email:user.email,password}});const actor={...login.json.data,cookie:login.cookie};
  assert.equal((await call('/clients',{actor})).status,200);
  assert.equal((await call('/clients',{actor,method:'POST',body:{name:'Forbidden'}})).status,403);
});
test('seed guard rejects production, remote, mismatched and unacknowledged databases',()=>{
  const env={NODE_ENV:'development',MONGO_URI:'mongodb://127.0.0.1:27017/crm_demo',SEED_DATABASE_NAME:'crm_demo',SEED_ALLOW_RESET:'DELETE_DEMO_DATA',DEMO_PASSWORD:password};
  assert.equal(assertSeedAllowed(env),'crm_demo');
  for(const change of [{NODE_ENV:'production'},{MONGO_URI:'mongodb://remote.example/crm_demo'},{SEED_DATABASE_NAME:'other_demo'},{SEED_ALLOW_RESET:''},{MONGO_URI:'mongodb://localhost/production'},{DEMO_PASSWORD:'short'}])assert.throws(()=>assertSeedAllowed({...env,...change}));
});
test('asynchronous database errors return a safe 500 and the API remains available',async()=>{
  const original=Client.find;
  Client.find=()=>{throw new Error('Private database connection details');};
  try {
    const result=await call('/clients',{actor:a});
    assert.equal(result.status,500);
    assert.equal(result.json.message,'Unable to complete request');
    assert.equal(result.json.stack,undefined);
  } finally {Client.find=original;}
  assert.equal((await call('/clients',{actor:a})).status,200);
});

