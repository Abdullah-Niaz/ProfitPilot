export default function KpiCard({ title, value, sub, tone="blue" }){
 const toneMap={blue:"bg-blue-50 text-blue-700",green:"bg-green-50 text-green-700",red:"bg-red-50 text-red-700",amber:"bg-amber-50 text-amber-700"};
 return <div className="card p-5 hover:-translate-y-1 transition duration-200">
   <div className={`badge ${toneMap[tone]}`}>{title}</div>
   <div className="mt-4 text-3xl font-black tracking-tight">{value}</div>
   <p className="mt-1 text-sm text-slate-500">{sub}</p>
 </div>
}
