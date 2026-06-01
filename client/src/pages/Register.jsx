import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { setCredentials } from "../app/store";
export default function Register(){
 const [form,setForm]=useState({name:"",email:"",password:"",workspaceName:""}); const dispatch=useDispatch(),nav=useNavigate();
 const submit=async(e)=>{e.preventDefault(); const {data}=await api.post('/auth/register',form); dispatch(setCredentials({...data.data, workspaceId:data.data.workspace._id})); nav('/');};
 return <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100"><form onSubmit={submit} className="card w-full max-w-lg p-8"><h1 className="text-3xl font-black">Create your agency workspace</h1><div className="mt-6 space-y-4">{['name','email','workspaceName'].map(k=><input key={k} className="input" placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>)}<input className="input" type="password" placeholder="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button className="btn w-full">Create account</button></div><p className="mt-5 text-sm text-slate-500">Already registered? <Link className="text-blue-600 font-semibold" to="/login">Login</Link></p></form></div>
}
