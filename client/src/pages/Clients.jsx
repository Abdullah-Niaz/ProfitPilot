import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { api } from "../services/api";
export default function Clients(){
 const {data,isLoading}=useQuery({queryKey:['clients'],queryFn:()=>api.get('/clients').then(r=>r.data.data)});
 return <><PageHeader eyebrow="Workspace" title="Clients" description="Manage and analyze clients data with workspace-level isolation." action={<button className="btn">Add Client</button>} />
 <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="text-left p-4">name</th><th className="text-left p-4">industry</th><th className="text-left p-4">status</th></tr></thead><tbody>{isLoading?<tr><td className="p-4">Loading...</td></tr>:data?.map(item=><tr key={item._id} className="border-t hover:bg-slate-50"><td className="p-4">{item.name || item.client?.name || "-"}</td><td className="p-4">{item.industry || item.client?.name || "-"}</td><td className="p-4">{item.status || item.client?.name || "-"}</td></tr>)}</tbody></table></div></>
}
