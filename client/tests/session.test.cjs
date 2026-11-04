const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createRequire}=require('node:module');
const {transformSync}=createRequire(require.resolve('vite/package.json'))('esbuild');
const {AxiosError}=require('axios');
const {readFileSync}=require('node:fs');
function harness(){
  const storage=new Map();
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
  const sourceRoot=path.resolve(__dirname,'../src');
  const cache=new Map();
  function load(filename){
    if(cache.has(filename))return cache.get(filename).exports;
    const module={exports:{}};cache.set(filename,module);
    const code=transformSync(readFileSync(filename,'utf8'),{format:'cjs',loader:'js',define:{'import.meta.env.VITE_API_URL':'"http://test.local/api"'}}).code;
    const resolve=id=>{
      if(!id.startsWith('.'))return require(id);
      let target=path.resolve(path.dirname(filename),id);if(!path.extname(target))target+='.js';
      assert.ok(target.startsWith(sourceRoot+path.sep));return load(target);
    };
    new Function('require','module','exports','localStorage',code)(resolve,module,module.exports,localStorage);
    return module.exports;
  }
  const h={...load(path.join(sourceRoot,'services/api.js')),...load(path.join(sourceRoot,'app/store.js')),...load(path.join(sourceRoot,'app/queryClient.js')),localStorage};
  h.store.dispatch(h.setCredentials({accessToken:'token-a',workspaceId:'workspace-a',user:{id:'user-a',name:'A'}}));
  return h;
}
const response=(config,data)=>({config,status:200,statusText:'OK',headers:{},data:{data}});
function unauthorized(config){return new AxiosError('Unauthorized','ERR_BAD_REQUEST',config,null,{config,status:401,statusText:'Unauthorized',headers:{},data:{}});}

test('account changes and logout clear queries without erasing unrelated browser storage',()=>{
  const h=harness();h.localStorage.setItem('unrelated-preference','keep');
  h.queryClient.setQueryData(['workspace','user-a','workspace-a','clients'],['private A']);
  h.store.dispatch(h.setCredentials({accessToken:'token-b',workspaceId:'workspace-b',user:{id:'user-b'}}));
  assert.equal(h.queryClient.getQueryCache().getAll().length,0);
  h.queryClient.setQueryData(['workspace','user-b','workspace-b','clients'],['private B']);
  h.store.dispatch(h.logout());assert.equal(h.queryClient.getQueryCache().getAll().length,0);
  assert.equal(h.store.getState().auth.accessToken,null);assert.equal(h.localStorage.getItem('unrelated-preference'),'keep');
});
test('concurrent unauthorized requests share one refresh and retry with the new access token',async()=>{
  const h=harness();let refreshes=0;
  h.api.defaults.adapter=async config=>{
    if(config.url==='/auth/refresh-token'){refreshes++;await new Promise(resolve=>setTimeout(resolve,30));return response(config,{accessToken:'renewed'});}
    if(!config.retried)throw unauthorized(config);
    assert.equal(config.headers.Authorization,'Bearer renewed');return response(config,{ok:true});
  };
  const results=await Promise.all([h.api.get('/clients'),h.api.get('/projects')]);
  assert.equal(refreshes,1);assert.ok(results.every(r=>r.data.data.ok));assert.equal(h.store.getState().auth.accessToken,'renewed');
});
test('rejected refresh clears the session, but network failures preserve it for retry',async()=>{
  const h=harness();h.queryClient.setQueryData(['private'],['old']);
  h.api.defaults.adapter=async config=>{throw unauthorized(config);};
  await assert.rejects(h.api.get('/clients'));assert.equal(h.store.getState().auth.accessToken,null);assert.equal(h.queryClient.getQueryCache().getAll().length,0);
  h.store.dispatch(h.setCredentials({accessToken:'still-valid',workspaceId:'workspace-a',user:{id:'user-a'}}));
  h.api.defaults.adapter=async config=>{if(config.url==='/auth/refresh-token')throw new AxiosError('Offline','ERR_NETWORK',config);throw unauthorized(config);};
  await assert.rejects(h.api.get('/clients'));assert.equal(h.store.getState().auth.accessToken,'still-valid');
});
test('a response from the previous account cannot populate the new account cache',async()=>{
  const h=harness();let release;
  h.api.defaults.adapter=config=>new Promise(resolve=>{release=()=>resolve(response(config,['private A']));});
  const request=h.api.get('/clients');
  while(!release)await new Promise(resolve=>setTimeout(resolve,1));
  h.store.dispatch(h.setCredentials({accessToken:'token-b',workspaceId:'workspace-b',user:{id:'user-b'}}));
  release();await assert.rejects(request,/Account changed/);assert.equal(h.store.getState().auth.user.id,'user-b');
});

test('financial retries reuse their key after network failure and rotate after success', async () => {
  const h = harness();
  const keys = [];
  let attempt = 0;
  h.api.defaults.adapter = async config => {
    keys.push(config.headers['Idempotency-Key']);
    if (attempt++ === 0) throw new AxiosError('Connection lost', 'ERR_NETWORK', config);
    return response(config, { ok: true });
  };
  const body = { invoice: 'invoice-a', amount: 25 };
  await assert.rejects(h.api.post('/payments', body));
  await h.api.post('/payments', body);
  await h.api.post('/payments', body);
  assert.ok(keys[0]);
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[1], keys[2]);
});

test('financial key survives access-token refresh and simultaneous identical submissions', async () => {
  const h = harness();
  const keys = [];
  h.api.defaults.adapter = async config => {
    if (config.url === '/auth/refresh-token') return response(config, { accessToken: 'renewed' });
    keys.push(config.headers['Idempotency-Key']);
    if (!config.retried) throw unauthorized(config);
    return response(config, { ok: true });
  };
  await h.api.post('/payments', { invoice: 'invoice-a', amount: 10 });
  assert.equal(keys[0], keys[1]);
  const concurrent = [];
  h.api.defaults.adapter = async config => {
    concurrent.push(config.headers['Idempotency-Key']);
    await new Promise(resolve => setTimeout(resolve, 20));
    return response(config, { ok: true });
  };
  await Promise.all([h.api.post('/expenses', { amount: 4 }), h.api.post('/expenses', { amount: 4 })]);
  assert.equal(concurrent[0], concurrent[1]);
});
