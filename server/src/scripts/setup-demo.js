import fs from 'node:fs/promises';
import {existsSync,constants} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import mongoose from 'mongoose';
const local=path.resolve('../.local');
await fs.mkdir(path.join(local,'mongo-demo'),{recursive:true});
const direct='mongodb://127.0.0.1:27018/financial_crm_demo?directConnection=true';
let started=false;
try{await mongoose.connect(direct,{serverSelectionTimeoutMS:1500});}
catch{
  await mongoose.disconnect();
  const binary=process.env.MONGOD_BINARY || ['C:/Program Files/MongoDB/Server/9.0/bin/mongod.exe','C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe'].find(existsSync) || 'mongod';
  const child=spawn(binary,['--dbpath',path.join(local,'mongo-demo'),'--port','27018','--bind_ip','127.0.0.1','--replSet','crmDemo','--wiredTigerCacheSizeGB','0.25','--logpath',path.join(local,'mongo-demo.log'),'--logappend'],{detached:true,windowsHide:true,stdio:'ignore'});
  let failed;child.once('error',error=>{failed=error;});child.unref();
  await fs.writeFile(path.join(local,'mongo-demo.pid'),String(child.pid||''));
  started=true;
  for(let i=0;i<50;i++){if(failed)throw failed;try{await mongoose.connect(direct,{serverSelectionTimeoutMS:500});break;}catch(e){if(i===49)throw e;await new Promise(r=>setTimeout(r,300));}}
}
try{
  const admin=mongoose.connection.db.admin();
  let hello=await admin.command({hello:1});
  if(!hello.setName){
    if(!started)throw new Error('Port 27018 is occupied by an unrelated MongoDB; no changes made.');
    await admin.command({replSetInitiate:{_id:'crmDemo',members:[{_id:0,host:'127.0.0.1:27018'}]}});
  }else if(hello.setName!=='crmDemo')throw new Error('Port 27018 belongs to another replica set; no changes made.');
  for(let i=0;i<100;i++){hello=await admin.command({hello:1});if(hello.isWritablePrimary)break;await new Promise(r=>setTimeout(r,300));}
  if(!hello.isWritablePrimary)throw new Error('Demo replica set is not ready');
  const original=await fs.readFile('.env','utf8');
  try{await fs.copyFile('.env','.env.before-demo',constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
  let updated=original;
  const values={MONGO_URI:'mongodb://127.0.0.1:27018/financial_crm_demo?replicaSet=crmDemo',NODE_ENV:'development'};
  for(const [key,value] of Object.entries(values)){
    const re=new RegExp('^'+key+'=.*$','m');
    updated=re.test(updated)?updated.replace(re,key+'='+value):updated+'\n'+key+'='+value+'\n';
  }
  await fs.writeFile('.env',updated);
  console.log('Local demo replica set ready on port 27018. Original configuration saved in .env.before-demo; original database unchanged.');
}finally{await mongoose.disconnect();}
