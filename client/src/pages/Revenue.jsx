import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { api } from "../services/api";
export default function Revenue(){
 const {data,isLoading}=useQuery({queryKey:['revenue'],queryFn:()=>api.get('/revenue').then(r=>r.data.data)});
 return <><PageHeader eyebrow="Workspace" title="Revenue" description="Manage and analyze revenue data with workspace-level isolation." action={<button className="btn">Add Revenue</button>} />
 <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="text-left p-4">amount</th><th className="text-left p-4">type</th><th className="text-left p-4">paymentStatus</th></tr></thead><tbody>{isLoading?<tr><td className="p-4">Loading...</td></tr>:data?.map(item=><tr key={item._id} className="border-t hover:bg-slate-50"><td className="p-4">{item.amount || item.client?.name || "-"}</td><td className="p-4">{item.type || item.client?.name || "-"}</td><td className="p-4">{item.paymentstatus || item.client?.name || "-"}</td></tr>)}</tbody></table></div></>
}
