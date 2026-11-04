import {useState} from 'react';
import {useDispatch} from 'react-redux';
import {useNavigate,Link} from 'react-router-dom';
import {api} from '../services/api';
import {setCredentials} from '../app/store';
export default function Register(){
  const [form,setForm]=useState({name:'',email:'',password:'',workspaceName:''});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const dispatch=useDispatch(),nav=useNavigate();
  async function submit(event){
    event.preventDefault();setError('');setBusy(true);
    try {const {data}=await api.post('/auth/register',form);dispatch(setCredentials(data.data));nav('/');}
    catch(err){setError(err.response?.data?.message || 'Could not create your account. Please retry.');}
    finally{setBusy(false);}
  }
  return <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100"><form onSubmit={submit} className="card w-full max-w-lg p-8"><h1 className="text-3xl font-black">Create your agency workspace</h1><div className="mt-6 space-y-4">{[['name','Your name'],['email','Email address'],['workspaceName','Workspace name']].map(([key,label])=><label className="block" key={key}>{label}<input className="input mt-1" type={key==='email'?'email':'text'} required maxLength={key==='email'?254:100} autoComplete={key==='name'?'name':key==='email'?'email':'organization'} value={form[key]} onChange={event=>setForm({...form,[key]:event.target.value})}/></label>)}<label className="block">Password<input className="input mt-1" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/></label><p className="text-sm text-slate-600">Use at least 12 characters, up to 72 UTF-8 bytes.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<button className="btn w-full" disabled={busy}>{busy?'Creating account...':'Create account'}</button></div><p className="mt-5 text-sm text-slate-500">Already registered? <Link className="text-blue-600 font-semibold" to="/login">Login</Link></p></form></div>;
}
