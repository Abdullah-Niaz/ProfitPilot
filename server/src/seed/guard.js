export function assertSeedAllowed(env) {
  if (env.NODE_ENV !== 'development') throw new Error('Seeding requires NODE_ENV=development');
  const uri = new URL(env.MONGO_URI || '');
  const database = decodeURIComponent(uri.pathname.slice(1));
  if (uri.protocol !== 'mongodb:' || !['127.0.0.1','localhost','[::1]'].includes(uri.hostname)) throw new Error('Seed only a local MongoDB database');
  if (!/^[a-zA-Z0-9_-]+_(demo|test|dev)$/.test(database)) throw new Error('Seed database must end in _demo, _test, or _dev');
  if (env.SEED_DATABASE_NAME !== database || env.SEED_ALLOW_RESET !== 'DELETE_DEMO_DATA') throw new Error('Explicit database name and reset acknowledgement required');
  if (!env.DEMO_PASSWORD || env.DEMO_PASSWORD.length < 12 || Buffer.byteLength(env.DEMO_PASSWORD,'utf8') > 72) throw new Error('Set a unique DEMO_PASSWORD of 12+ characters and at most 72 UTF-8 bytes');
  return database;
}
