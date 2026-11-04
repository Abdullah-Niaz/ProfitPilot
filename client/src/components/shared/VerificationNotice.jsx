import React,{useState} from 'react';
import {api} from '../../services/api';
export default function VerificationNotice(){
  const [message,setMessage]=useState(''),[link,setLink]=useState(''),[busy,setBusy]=useState(false);
  async function request(){setBusy(true);try{const r=await api.post('/auth/request-verification');setMessage(r.data.message);setLink(r.data.data?.developmentLink||'');}catch(e){setMessage(e.response?.data?.message||'Unable to request verification');}finally{setBusy(false);}}
  return <section className="card p-4 mb-5 flex flex-wrap items-center gap-4"><p className="text-sm">Verify your account email.</p><button className="btn" disabled={busy} onClick={request}>{busy?'Preparing…':'Send verification email'}</button><p role="status" className="text-sm">{message}</p>{link&&<a className="underline text-sm" href={link}>Open local verification preview</a>}</section>;
}
