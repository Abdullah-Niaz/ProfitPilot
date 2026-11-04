import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {setCredentials} from '../app/store';
import {api} from '../services/api';
export default function AccountAction({kind}){
  const dispatch=useDispatch(),navigate=useNavigate();
  const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token')||'');
  const [password,setPassword]=useState(''),[existing,setExisting]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
  const invite=kind==='invite';
  async function submit(e){
    e.preventDefault();setBusy(true);setMessage('');
    try{
      const response=await api.post(invite?'/auth/accept-invitation':'/auth/verify-email',
        invite?{token,...(existing?{password}:{newPassword:password})}:{token});
      if(invite){dispatch(setCredentials(response.data.data));navigate('/');}
      else{setDone(true);setMessage('Email verified. Sign in again to refresh your account status.');}
    }catch(error){setMessage(error.response?.data?.message||'Unable to complete this request.');}
    finally{setBusy(false);}
  }
  return <main className="min-h-screen grid place-items-center p-6 bg-slate-100"><section className="card p-8 w-full max-w-md space-y-5">
    <h1 className="text-2xl font-bold">{invite?'Join your agency':'Verify your email'}</h1>
    <p className="text-slate-600">{invite?'Accept the invitation to access your team workspace.':'Confirm that this email address belongs to you.'}</p>
    {message&&<p role="status" className="text-sm">{message}</p>}
    {!token?<p role="alert">This link is incomplete. Request a new email.</p>:!done&&<form onSubmit={submit} className="space-y-4">
      {invite&&<><label className="flex gap-2"><input type="checkbox" checked={existing} onChange={e=>setExisting(e.target.checked)}/>I already have an account</label>
      <label className="block">{existing?'Your existing password':'Choose a password (12+ characters)'}<input className="input mt-2" type="password" required minLength={existing?1:12} autoComplete={existing?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label></>}
      <button className="btn w-full" disabled={busy}>{busy?'Please wait…':invite?'Accept invitation':'Verify email'}</button>
    </form>}
    <Link className="text-sm underline" to="/login">Back to sign in</Link>
  </section></main>;
}
