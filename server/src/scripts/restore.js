import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import 'dotenv/config';
const {EJSON}=mongoose.mongo.BSON;
export async function restoreDatabase(sourceDir,{replaceDatabase}={}){
  const db=mongoose.connection.db;
  if(!db)throw new Error('Database is not connected');
  const root=path.resolve(sourceDir);
  const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
  if(manifest.version!==2)throw new Error('Only type-preserving version 2 backups can be restored');
  const prepared=[];
  // Validate every file before any database mutation.
  for(const [name,info] of Object.entries(manifest.collections)){
    if(!name || name.startsWith('system.') || name.includes('$') || name.includes('\0'))throw new Error('Invalid collection name');
    const file=path.resolve(root,info.file);
    if(path.dirname(file)!==root)throw new Error('Backup file escapes backup directory');
    const content=await fs.readFile(file,'utf8');
    if(crypto.createHash('sha256').update(content).digest('hex')!==info.sha256)throw new Error('Backup checksum mismatch');
    const docs=EJSON.parse(content,{relaxed:false});
    if(!Array.isArray(docs)||docs.length!==info.count)throw new Error('Backup count mismatch');
    prepared.push({name,info,docs});
  }
  const populated=await db.listCollections({type:'collection'}).toArray();
  for(const col of populated){
    if(!col.name.startsWith('system.') && await db.collection(col.name).countDocuments({}, {limit:1}) && replaceDatabase!==db.databaseName)
      throw new Error('Target is not empty. Explicit replaceDatabase matching the target name is required.');
  }
  // Create collections/indexes before the transaction; existing data is untouched.
  for(const {name,info} of prepared){
    try{await db.createCollection(name);}catch(e){if(e.code!==48)throw e;}
    for(const index of info.indexes||[]){
      if(index.name==='_id_')continue;
      const {key,v,ns,background,...options}=index;
      await db.collection(name).createIndex(key,options);
    }
  }
  const session=await mongoose.startSession();
  const report={restoredFrom:root,collectionsRestored:{}};
  try{
    await session.withTransaction(async()=>{
      for(const {name,docs,info} of prepared){
        await db.collection(name).deleteMany({},{session});
        if(docs.length)await db.collection(name).insertMany(docs,{session});
        const count=await db.collection(name).countDocuments({},{session});
        if(count!==info.count)throw new Error('Restore verification failed');
        report.collectionsRestored[name]={expected:info.count,restored:count,verified:true};
      }
    });
  }finally{await session.endSession();}
  return report;
}
if(process.argv[1]?.endsWith('restore.js')){
  if(!process.env.MONGO_URI || !process.argv[2])throw new Error('MONGO_URI and backup directory required');
  await mongoose.connect(process.env.MONGO_URI);
  try{
    if(process.env.RESTORE_DATABASE!==mongoose.connection.name)throw new Error('Set RESTORE_DATABASE to the exact target database name');
    const result=await restoreDatabase(process.argv[2],{replaceDatabase:process.env.RESTORE_REPLACE==='YES'?process.env.RESTORE_DATABASE:undefined});
    console.log('Restore verified: '+Object.keys(result.collectionsRestored).length+' collections');
  }finally{await mongoose.disconnect();}
}
