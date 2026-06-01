import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import KpiCard from "../components/cards/KpiCard";
import PageHeader from "../components/shared/PageHeader";
const money=n=>`$${Number(n||0).toLocaleString()}`;
export default function Dashboard(){
 const overview=useQuery({queryKey:['overview'],queryFn:()=>api.get('/analytics/overview').then(r=>r.data.data)});
 const trend=useQuery({queryKey:['monthly-profit'],queryFn:()=>api.get('/analytics/monthly-profit').then(r=>r.data.data)});
 const breakdown=useQuery({queryKey:['expense-breakdown'],queryFn:()=>api.get('/analytics/expense-breakdown').then(r=>r.data.data)});
 const data=overview.data||{};
 return <><PageHeader eyebrow="Agency Finance" title="Executive Dashboard" description="Track profit, client health, revenue leakage, and agency performance from one workspace." />
 <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5"><KpiCard title="Revenue" value={money(data.totalRevenue)} sub="Total collected"/><KpiCard title="Expenses" value={money(data.totalExpenses)} sub="Allocated costs" tone="amber"/><KpiCard title="Net Profit" value={money(data.netProfit)} sub="Revenue minus expenses" tone="green"/><KpiCard title="Avg Margin" value={`${data.averageMargin||0}%`} sub="Overall profitability" tone="blue"/></div>
 <div className="grid xl:grid-cols-3 gap-5 mt-6"><div className="card p-5 xl:col-span-2"><h3 className="font-bold text-lg">Monthly Profit Trend</h3><div className="h-80 mt-4"><ResponsiveContainer><AreaChart data={trend.data||[]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Area type="monotone" dataKey="revenue"/><Area type="monotone" dataKey="expenses"/><Area type="monotone" dataKey="profit"/></AreaChart></ResponsiveContainer></div></div><div className="card p-5"><h3 className="font-bold text-lg">Expense Breakdown</h3><div className="h-80 mt-4"><ResponsiveContainer><PieChart><Pie data={breakdown.data||[]} dataKey="value" nameKey="name" outerRadius={105} label>{(breakdown.data||[]).map((_,i)=><Cell key={i}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div></div></>
}
