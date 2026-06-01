import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { api } from "../services/api";
export default function Expenses(){
 const {data,isLoading}=useQuery({queryKey:['expenses'],queryFn:()=>api.get('/expenses').then(r=>r.data.data)});
 return <><PageHeader eyebrow="Workspace" title="Expenses" description="Manage and analyze expenses data with workspace-level isolation." action={<button className="btn">Add Expense</button>} />
 <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="text-left p-4">amount</th><th className="text-left p-4">category</th><th className="text-left p-4">date</th></tr></thead><tbody>{isLoading?<tr><td className="p-4">Loading...</td></tr>:data?.map(item=><tr key={item._id} className="border-t hover:bg-slate-50"><td className="p-4">{item.amount || item.client?.name || "-"}</td><td className="p-4">{item.category || item.client?.name || "-"}</td><td className="p-4">{item.date || item.client?.name || "-"}</td></tr>)}</tbody></table></div></>
}
