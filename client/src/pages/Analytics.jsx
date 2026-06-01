import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { api } from "../services/api";
export default function Analytics(){
 const {data}=useQuery({queryKey:['client-ranking'],queryFn:()=>api.get('/analytics/client-ranking').then(r=>r.data.data)});
 return <><PageHeader eyebrow="Profitability" title="Client Ranking" description="Rank clients by profit, margin, revenue, and cost burden." />
 <div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-4 text-left">Client</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Margin</th></tr></thead><tbody>{data?.map(c=><tr key={c.clientId} className="border-t"><td className="p-4 font-semibold">{c.name}</td><td>${c.revenue}</td><td>${c.expenses}</td><td>${c.profit}</td><td>{c.margin}%</td></tr>)}</tbody></table></div></>
}
