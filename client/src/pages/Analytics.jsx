import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import { formatMoney, formatPercent } from "../lib/formatters";
import { api } from "../services/api";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { BarChart3, TrendingUp, DollarSign, Receipt, PieChart as PieIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

const PIE_COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b", "#f43f5e"];

export default function Analytics() {
  const [basis, setBasis] = useState("cash"); // 'cash' or 'accrual'

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["analytics-overview", basis],
    queryFn: () => api.get(`/analytics/overview?basis=${basis}`).then(r => r.data.data)
  });

  const { data: monthlyTrend, isLoading: loadingTrend } = useQuery({
    queryKey: ["analytics-monthly-profit", basis],
    queryFn: () => api.get(`/analytics/monthly-profit?basis=${basis}`).then(r => r.data.data)
  });

  const { data: expenseBreakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ["analytics-expense-breakdown"],
    queryFn: () => api.get("/analytics/expense-breakdown").then(r => r.data.data)
  });

  const { data: clientRanking, isLoading: loadingRanking } = useQuery({
    queryKey: ["analytics-client-ranking"],
    queryFn: () => api.get("/analytics/client-ranking").then(r => r.data.data)
  });

  const overviewData = overview || {};
  const isPositive = (overviewData.netProfit || 0) >= 0;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Financial Intelligence</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Agency Reports & Analytics</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Audit-grade reporting across cash flow statements, earned accrual P&L, expense allocation, and client margins.
          </p>
        </div>

        {/* Accounting Basis Switcher */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center shrink-0 self-start md:self-auto">
          <button
            onClick={() => setBasis("cash")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              basis === "cash"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cash Basis (Settled)
          </button>
          <button
            onClick={() => setBasis("accrual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              basis === "accrual"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Accrual Basis (Earned)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>{basis === "cash" ? "Cash Inflow" : "Earned Revenue"}</span>
            <DollarSign size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatMoney(overviewData.totalRevenue)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {basis === "cash" ? "Cleared client receipts" : "Billed & earned milestones"}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Allocated Expenses</span>
            <Receipt size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {formatMoney(overviewData.totalExpenses)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Excludes audited reversals</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Net Profit</span>
            {isPositive ? (
              <ArrowUpRight size={16} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={16} className="text-rose-500" />
            )}
          </div>
          <div className={`text-2xl font-black mt-2 ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
            {formatMoney(overviewData.netProfit)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {basis === "cash" ? "Net cash generation" : "Net earned margin"}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Operating Margin</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {formatPercent(overviewData.averageMargin)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Average profitability ratio</div>
        </div>
      </div>

      {/* Monthly Profit & Expense Breakdown Charts */}
      <div className="grid xl:grid-cols-3 gap-6 mb-6">
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Monthly Financial Trend</h3>
              <p className="text-xs text-slate-500">Revenue, costs, and net margin over time ({basis} basis)</p>
            </div>
          </div>
          <div className="h-72">
            {loadingTrend ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading trend...</div>
            ) : (monthlyTrend || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No monthly data recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <h3 className="font-bold text-slate-900 text-base mb-1">Expense Allocation</h3>
          <p className="text-xs text-slate-500 mb-4">Cost breakdown by operational category</p>
          <div className="h-72">
            {loadingBreakdown ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading breakdown...</div>
            ) : (expenseBreakdown || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No expenses recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {(expenseBreakdown || []).map((_, i) => (
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

      {/* Client Profitability Ranking */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Client Profitability Ranking</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ranked by net contribution and profit margin</p>
          </div>
        </div>

        {loadingRanking ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading ranking...</div>
        ) : (clientRanking || []).length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No clients or transactions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">Client</th>
                  <th className="table-th">Industry</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Revenue</th>
                  <th className="table-th">Costs</th>
                  <th className="table-th">Net Profit</th>
                  <th className="table-th text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {clientRanking.map((c) => {
                  const clientProfitPositive = (c.profit || 0) >= 0;
                  return (
                    <tr key={c.clientId} className="hover:bg-slate-50/70 transition">
                      <td className="table-td font-semibold text-slate-900">{c.name}</td>
                      <td className="table-td text-xs text-slate-600">{c.industry || "-"}</td>
                      <td className="table-td">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="table-td font-medium text-slate-900">{formatMoney(c.revenue)}</td>
                      <td className="table-td text-amber-700 font-medium">{formatMoney(c.expenses)}</td>
                      <td className={`table-td font-bold ${clientProfitPositive ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatMoney(c.profit)}
                      </td>
                      <td className="table-td text-right font-bold text-blue-700">
                        {formatPercent(c.margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
