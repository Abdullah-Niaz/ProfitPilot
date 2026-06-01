import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { api } from "../services/api";
export default function Projects(){
 const {data,isLoading}=useQuery({queryKey:['projects'],queryFn:()=>api.get('/projects').then(r=>r.data.data)});
 return <><PageHeader eyebrow="Workspace" title="Projects" description="Manage and analyze projects data with workspace-level isolation." action={<button className="btn">Add Project</button>} />
 <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="text-left p-4">name</th><th className="text-left p-4">status</th><th className="text-left p-4">budget</th></tr></thead><tbody>{isLoading?<tr><td className="p-4">Loading...</td></tr>:data?.map(item=><tr key={item._id} className="border-t hover:bg-slate-50"><td className="p-4">{item.name || item.client?.name || "-"}</td><td className="p-4">{item.status || item.client?.name || "-"}</td><td className="p-4">{item.budget || item.client?.name || "-"}</td></tr>)}</tbody></table></div></>
}
