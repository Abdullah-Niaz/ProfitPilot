import mongoose from 'mongoose';
// Models are imported before the test database starts. Delay schema creation
// until the newly initialized replica set has a writable primary.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

export async function initializeReplicaSet(port) {
  await mongoose.connection.db.admin().command({
    replSetInitiate: { _id: 'crmTest', members: [{ _id: 0, host: '127.0.0.1:' + port }] }
  });
  for (let attempt = 0; attempt < 150; attempt++) {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (hello.isWritablePrimary) {
      for (const model of Object.values(mongoose.models)) {
        await model.createCollection();
        await model.createIndexes();
      }
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Test replica set did not elect a primary');
}
