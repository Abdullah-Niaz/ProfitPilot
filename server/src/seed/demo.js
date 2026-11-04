import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import {create as invoiceCreate,sendInvoice} from '../controllers/invoice.controller.js';
import {create as paymentCreate} from '../controllers/payment.controller.js';
import {create as expenseCreate} from '../controllers/expense.controller.js';
import {connectDB} from '../config/db.js';
const uri=new URL(process.env.MONGO_URI||'');
if(process.env.NODE_ENV!=='development' || !['127.0.0.1','localhost'].includes(uri.hostname) || !uri.pathname.endsWith('_demo'))
  throw new Error('Demo seed requires development mode and a local database ending in _demo');
await connectDB();
const email='demo@agency.example',name='Demo Agency Owner';
try{
  const existing=await User.findOne({email});
  if(existing){console.log('Demo account already exists; no data changed. Login details: server/.demo-login.txt');}
  else{
    const password=crypto.randomBytes(18).toString('base64url');
    await fs.writeFile('.demo-login.txt','Local demo only\nEmail: '+email+'\nPassword: '+password+'\n',{mode:0o600,flag:'wx'});
    try{
      await mongoose.connection.transaction(async()=>{
        const user=await User.create({name,email,password,isEmailVerified:true});
        const workspace=await Workspace.create({name:'Nova Growth Studio — DEMO',owner:user._id,currency:'USD',industry:'Digital Agency'});
        await WorkspaceMember.create({workspace:workspace._id,user:user._id,role:'Owner',status:'active'});
        async function run(handler,body,params={}){
          let result;const res={status(){return this;},json(v){result=v.data;return this;}};
          await handler({body,params,user,workspaceId:workspace._id},res);return result;
        }
        const names=['Northstar Labs','Bloom & Co','Harbor Retail','Atlas Fitness','Lumina Design','Cedar Consulting'];
        for(let i=0;i<names.length;i++){
          const client=await Client.create({workspace:workspace._id,name:names[i],email:'finance'+i+'@example.test',industry:['SaaS','Retail','Consulting'][i%3],status:'Active'});
          const project=await Project.create({workspace:workspace._id,client:client._id,name:['Brand launch','Website redesign','Growth campaign'][i%3],budget:12000+i*1500,currency:'USD',status:i===5?'Completed':'Active'});
          for(let j=0;j<3;j++){
            const date=new Date();date.setUTCMonth(date.getUTCMonth()-(5-i));date.setUTCDate(5+j*6);
            const due=new Date(date);due.setUTCDate(due.getUTCDate()+30);
            const amount=1800+i*400+j*250;
            const invoice=await run(invoiceCreate,{client:String(client._id),project:String(project._id),invoiceNo:'DEMO-'+(i+1)+'-'+(j+1),amount,issueDate:date.toISOString(),dueDate:due.toISOString(),notes:'Fictional demo data'});
            await run(sendInvoice,{}, {id:String(invoice._id)});
            if(j<2)await run(paymentCreate,{invoice:String(invoice._id),amount:j===0?amount:amount/2,paidAt:date.toISOString(),paymentMethod:'Bank Transfer'});
            else if(due<new Date())await Invoice.updateOne({_id:invoice._id},{$set:{status:'Overdue'}});
            await run(expenseCreate,{client:String(client._id),project:String(project._id),amount:450+i*80+j*30,category:['Freelancer Cost','Software Subscription','Marketing'][j],date:date.toISOString()});
          }
        }
      });
      console.log('Demo ready: 6 clients, 6 projects, 18 invoices, 12 payments, 18 expenses. Login details: server/.demo-login.txt');
    }catch(e){await fs.unlink('.demo-login.txt');throw e;}
  }
}finally{await mongoose.disconnect();}
