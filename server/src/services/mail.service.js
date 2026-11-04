import crypto from 'node:crypto';
import ActionToken from '../models/ActionToken.js';
import MailJob from '../models/MailJob.js';
export const digest = token => crypto.createHash('sha256').update(token).digest('hex');
export function actionLink(path, values) {
  const url = new URL(path, process.env.CLIENT_URL || 'http://localhost:5173');
  url.hash = new URLSearchParams(values).toString();
  return url.toString();
}
export async function queueMail(to, subject, link) {
  return MailJob.create({to,subject,text:subject+'\n\n'+link+'\n\nIf you did not request this, ignore this message.',
    expiresAt:new Date(Date.now()+60*60*1000)});
}
export async function issueAction(user, purpose, member) {
  await ActionToken.deleteMany({user:user._id,purpose,...(member?{member:member._id}:{})});
  const token=crypto.randomBytes(32).toString('hex');
  await ActionToken.create({hash:digest(token),purpose,user:user._id,member:member?._id,
    expiresAt:new Date(Date.now()+60*60*1000)});
  const link=actionLink(purpose==='invite'?'/accept-invitation':'/verify-email',{token});
  await queueMail(user.email,purpose==='invite'?'Accept your agency invitation':'Verify your email',link);
  return link;
}
// Run only from the explicitly started mail worker. No mail is sent by tests.
export async function deliverNext(fetcher=fetch) {
  if(!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('Configure RESEND_API_KEY and MAIL_FROM');
  const now=new Date();
  const job=await MailJob.findOneAndUpdate({expiresAt:{$gt:now},attempts:{$lt:8},$or:[
    {status:'pending',nextAttemptAt:{$lte:now}},{status:'sending',leaseUntil:{$lte:now}}
  ]},{$set:{status:'sending',leaseUntil:new Date(Date.now()+60000)},$inc:{attempts:1}},{new:true,sort:{createdAt:1}});
  if(!job)return false;
  try {
    const response=await fetcher('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'crm-mail-'+job._id},
      body:JSON.stringify({from:process.env.MAIL_FROM,to:[job.to],subject:job.subject,text:job.text}),signal:AbortSignal.timeout(15000)
    });
    if(!response.ok)throw new Error('Email provider HTTP '+response.status);
    const data=await response.json();
    await MailJob.updateOne({_id:job._id},{$set:{status:'sent',providerId:data.id},$unset:{text:1,leaseUntil:1}});
  } catch(error) {
    await MailJob.updateOne({_id:job._id},{$set:{status:job.attempts>=8?'failed':'pending',
      lastError:error.name==='TimeoutError'?'Email provider timeout':String(error.message).slice(0,150),
      nextAttemptAt:new Date(Date.now()+Math.min(3600000,30000*2**job.attempts))},$unset:{leaseUntil:1}});
  }
  return true;
}
