import React from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import { api } from "../services/api";
import { Brain, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";

export default function AIAdvisor() {
  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: ["agency-health-report"],
    queryFn: () => api.get("/ai/agency-health-report").then(r => r.data.data)
  });

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ["retain-drop-suggestions"],
    queryFn: () => api.get("/ai/retain-drop-suggestions").then(r => r.data.data)
  });

  return (
    <>
      <PageHeader
        eyebrow="Decision Support"
        title="AI Profitability Advisor"
        description="Intelligent recommendations analyzing revenue concentration, cost leakage, client margins, and risk scores."
      />

      {/* Agency Health Summary Banner */}
      <div className="card p-6 md:p-8 mb-6 bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950 text-white shadow-xl">
        <div className="flex items-center gap-2.5 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles size={16} /> Financial Health Diagnostic
        </div>
        <h3 className="text-2xl font-black">
          {loadingHealth ? "Analyzing agency financial patterns..." : health?.summary || "Healthy agency operating metrics."}
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-6 pt-4 border-t border-white/10 text-xs">
          <div>
            <span className="text-blue-200">Agency Operating Margin:</span>{" "}
            <span className="font-bold text-base text-white ml-1">{health?.margin ?? 0}%</span>
          </div>
          <div>
            <span className="text-blue-200">Net Profit Generated:</span>{" "}
            <span className="font-bold text-base text-white ml-1">${Number(health?.profit ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Client Recommendations */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Brain size={18} className="text-blue-600" /> Account Portfolio Recommendations
        </h3>
      </div>

      {loadingSuggestions ? (
        <div className="card p-12 text-center text-slate-400">Evaluating client performance metrics...</div>
      ) : (suggestions || []).length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No recommendations generated yet"
          description="Add clients, projects, and financial transactions to receive automated retain, upsell, and renegotiate advice."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {suggestions.map((s) => {
            const tone =
              s.type === "Retain"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : s.type === "Upsell"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : s.type === "Renegotiate"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-rose-50 text-rose-700 border-rose-200";

            return (
              <div key={s.client} className="card p-5 hover:shadow-md transition border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${tone}`}>
                      {s.type}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Score: <span className="text-slate-900">{s.score}</span>/100
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.recommendation}</p>
                </div>
                {s.metrics && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>Margin: <strong className="text-slate-800">{s.metrics.margin}%</strong></div>
                    <div>Net Profit: <strong className="text-slate-800">${s.metrics.profit}</strong></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
