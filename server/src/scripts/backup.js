import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import 'dotenv/config';
const {EJSON}=mongoose.mongo.BSON;
export async function backupDatabase(targetDir){
  const db=mongoose.connection.db;
  if(!db)throw new Error('Database is not connected');
  const collections=(await db.listCollections({type:'collection'}).toArray()).filter(c=>!c.name.startsWith('system.'));
  const manifest={version:2,timestamp:new Date().toISOString(),database:db.databaseName,collections:{}};
  await fs.mkdir(targetDir,{recursive:true});
  // Never overwrite an earlier backup.
  try{await fs.access(path.join(targetDir,'manifest.json'));throw new Error('Backup directory already contains a backup');}catch(e){if(e.code!=='ENOENT')throw e;}
  const session=await mongoose.startSession();
  try{
    session.startTransaction({readConcern:{level:'snapshot'}});
    for(const col of collections){
      const docs=await db.collection(col.name).find({},{session}).toArray();
      const content=EJSON.stringify(docs,{relaxed:false});
      const filename=Buffer.from(col.name).toString('hex')+'.json';
      await fs.writeFile(path.join(targetDir,filename),content,{mode:0o600});
      manifest.collections[col.name]={file:filename,count:docs.length,sha256:crypto.createHash('sha256').update(content).digest('hex'),
        indexes:await db.collection(col.name).indexes()};
    }
    await session.commitTransaction();
    await fs.writeFile(path.join(targetDir,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
    return manifest;
  }catch(e){if(session.inTransaction())await session.abortTransaction();throw e;}
  finally{await session.endSession();}
}
if(process.argv[1]?.endsWith('backup.js')){
  if(!process.env.MONGO_URI)throw new Error('MONGO_URI required');
  await mongoose.connect(process.env.MONGO_URI);
  try{const result=await backupDatabase(process.argv[2]||path.join('backups','backup-'+Date.now()));console.log('Backup complete: '+Object.keys(result.collections).length+' collections');}finally{await mongoose.disconnect();}
}
