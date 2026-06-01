import { useQuery } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import { api } from "../services/api";
export default function AIAdvisor(){
 const health=useQuery({queryKey:['health'],queryFn:()=>api.get('/ai/agency-health-report').then(r=>r.data.data)});
 const suggestions=useQuery({queryKey:['suggestions'],queryFn:()=>api.get('/ai/retain-drop-suggestions').then(r=>r.data.data)});
 return <><PageHeader eyebrow="AI Advisor" title="Client Profitability Advisor" description="Rule-based AI recommendations that explain which clients to retain, upsell, renegotiate, monitor, or drop." />
 <div className="card p-6 mb-6 bg-gradient-to-br from-blue-600 to-slate-950 text-white"><h3 className="text-xl font-bold">Agency Health Summary</h3><p className="mt-2 text-blue-100">{health.data?.summary}</p><div className="mt-4 text-3xl font-black">{health.data?.margin}% margin</div></div>
 <div className="grid md:grid-cols-2 gap-5">{suggestions.data?.map(s=><div key={s.client} className="card p-5"><div className="flex justify-between"><span className="badge bg-blue-50 text-blue-700">{s.type}</span><b>{s.score}/100</b></div><p className="mt-4 text-slate-600">{s.recommendation}</p></div>)}</div></>
}
