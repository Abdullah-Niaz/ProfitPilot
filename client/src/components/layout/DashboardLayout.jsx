import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { BarChart3, Brain, Briefcase, FolderKanban, LayoutDashboard, LogOut, Receipt, Users } from "lucide-react";
const links = [
  ["/", "Dashboard", LayoutDashboard], ["/clients", "Clients", Users], ["/projects", "Projects", FolderKanban], ["/revenue", "Revenue", Briefcase], ["/expenses", "Expenses", Receipt], ["/analytics", "Analytics", BarChart3], ["/ai-advisor", "AI Advisor", Brain]
];
export default function DashboardLayout(){
 const nav=useNavigate();
 return <div className="min-h-screen flex">
  <aside className="hidden lg:flex w-72 bg-slate-950 text-white p-6 flex-col">
    <div className="mb-8"><div className="text-2xl font-black">ProfitPilot</div><p className="text-slate-400 text-sm">Financial CRM for Agencies</p></div>
    <nav className="space-y-2 flex-1">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`flex items-center gap-3 rounded-xl px-4 py-3 transition ${isActive?'bg-blue-600':'hover:bg-slate-800 text-slate-300'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
    <button onClick={()=>{localStorage.clear();nav('/login')}} className="flex items-center gap-3 text-slate-300 hover:text-white"><LogOut size={18}/> Logout</button>
  </aside>
  <main className="flex-1 p-5 lg:p-8 overflow-x-hidden"><Outlet /></main>
 </div>
}
