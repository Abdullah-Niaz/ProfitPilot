import React from "react";
import { Link } from "react-router-dom";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api } from "../services/api";
import KpiCard from "../components/cards/KpiCard";
import PageHeader from "../components/shared/PageHeader";
import { formatMoney, formatPercent } from "../lib/formatters";
import {
  Plus,
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowRight
} from "lucide-react";

const PIE_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b", "#f43f5e"];

export default function Dashboard() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.get("/analytics/overview").then(r => r.data.data)
  });

  const { data: trend, isLoading: loadingTrend } = useQuery({
    queryKey: ["monthly-profit"],
    queryFn: () => api.get("/analytics/monthly-profit").then(r => r.data.data)
  });

  const { data: breakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ["expense-breakdown"],
    queryFn: () => api.get("/analytics/expense-breakdown").then(r => r.data.data)
  });

  const data = overview || {};

  return (
    <>
      <PageHeader
        eyebrow="Agency Intelligence"
        title="Executive Dashboard"
        description="Monitor real-time cash flow, client profitability, operational expenses, and agency margins."
        action={
          <div className="flex items-center gap-2.5">
            <Link to="/invoices" className="btn">
              <FileText size={15} /> Invoicing
            </Link>
            <Link to="/clients" className="btn-secondary">
              <Users size={15} /> Clients
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Revenue"
          value={formatMoney(data.totalRevenue)}
          sub="Settled cash & milestone income"
        />
        <KpiCard
          title="Allocated Expenses"
          value={formatMoney(data.totalExpenses)}
          sub="Operational & team overhead"
          tone="amber"
        />
        <KpiCard
          title="Net Profit"
          value={formatMoney(data.netProfit)}
          sub="Bottom line earnings"
          tone="green"
        />
        <KpiCard
          title="Average Margin"
          value={formatPercent(data.averageMargin)}
          sub="Agency profit margin ratio"
          tone="blue"
        />
      </div>

      {/* Quick Launchpad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link
          to="/clients"
          className="card p-4 hover:border-blue-400 hover:shadow-md transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Active Clients</div>
              <div className="text-lg font-bold text-slate-900">{data.activeClients ?? 0}</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition" />
        </Link>

        <Link
          to="/projects"
          className="card p-4 hover:border-indigo-400 hover:shadow-md transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Active Projects</div>
              <div className="text-lg font-bold text-slate-900">{data.activeProjects ?? 0}</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition" />
        </Link>

        <Link
          to="/invoices"
          className="card p-4 hover:border-emerald-400 hover:shadow-md transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Billing Hub</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Invoices &amp; AR</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-600 transition" />
        </Link>

        <Link
          to="/analytics"
          className="card p-4 hover:border-sky-400 hover:shadow-md transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Reports</div>
              <div className="text-xs font-bold text-slate-800 mt-1">P&amp;L Statements</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-sky-600 transition" />
        </Link>
      </div>

      {/* Main Charts */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Monthly Profit Trend</h3>
              <p className="text-xs text-slate-500">Revenue, costs, and net margin trajectory</p>
            </div>
            <Link to="/analytics" className="text-xs font-semibold text-blue-600 hover:underline">
              Detailed View &rarr;
            </Link>
          </div>
          <div className="h-72">
            {loadingTrend ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading trend...</div>
            ) : (trend || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No monthly records yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val) => formatMoney(val)}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Expense Breakdown</h3>
              <p className="text-xs text-slate-500">Allocated cost distribution</p>
            </div>
            <Link to="/expenses" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage &rarr;
            </Link>
          </div>
          <div className="h-72">
            {loadingBreakdown ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading breakdown...</div>
            ) : (breakdown || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No expenses recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {(breakdown || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatMoney(val)}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
