import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Modal from "../components/shared/Modal";
import { formatMoney, formatDate } from "../lib/formatters";
import { api } from "../services/api";
import { Receipt, Plus, Search, RotateCcw, AlertCircle, ExternalLink } from "lucide-react";

const CATEGORIES = [
  "Team Salary",
  "Freelancer Cost",
  "Software Subscription",
  "Hosting",
  "Marketing",
  "Operations",
  "Client-Specific Cost",
  "Miscellaneous"
];

export default function Expenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [formData, setFormData] = useState({
    client: "",
    project: "",
    amount: "",
    category: "Operations",
    receiptUrl: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [reversalReason, setReversalReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then(r => r.data.data)
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects").then(r => r.data.data)
  });

  const { data: expenses, isLoading, error } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.get("/expenses").then(r => r.data.data)
  });

  const filteredExpenses = (expenses || []).filter(e => {
    const matchesCategory = categoryFilter ? e.category === categoryFilter : true;
    const matchesSearch = searchTerm
      ? e.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const totalExpenses = (expenses || [])
    .filter(e => e.status !== "Reversed")
    .reduce((acc, e) => acc + (e.amountInCents || (e.amount * 100) || 0), 0) / 100;

  function openCreateModal() {
    setFormData({
      client: clients?.[0]?._id || "",
      project: "",
      amount: "",
      category: "Operations",
      receiptUrl: "",
      date: new Date().toISOString().split("T")[0]
    });
    setFormError("");
    setCreateModalOpen(true);
  }

  function openReverseModal(exp) {
    setSelectedExpense(exp);
    setReversalReason("");
    setFormError("");
    setReverseModalOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        client: formData.client,
        project: formData.project || undefined,
        amount: Number(formData.amount),
        category: formData.category,
        receiptUrl: formData.receiptUrl || undefined,
        date: new Date(formData.date).toISOString()
      };
      await api.post("/expenses", payload);
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["expenses"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["overview"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["expense-breakdown"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["monthly-profit"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReverse(e) {
    e.preventDefault();
    if (!selectedExpense) return;
    setSubmitting(true);
    setFormError("");
    try {
      await api.post(`/expenses/${selectedExpense._id}/reverse`, { reason: reversalReason });
      setReverseModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["expenses"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["overview"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["expense-breakdown"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["monthly-profit"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to reverse expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Cost Accounting"
        title="Expenses"
        description="Track operational overhead, contractor payouts, software licenses, and client-allocated expenses."
        action={
          <button onClick={openCreateModal} className="btn">
            <Plus size={16} /> Add Expense
          </button>
        }
      />

      {/* KPI Card */}
      <div className="card p-5 mb-6 max-w-sm">
        <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Allocated Costs</div>
        <div className="text-2xl font-black text-slate-900 mt-1">{formatMoney(totalExpenses)}</div>
        <div className="text-xs text-slate-400 mt-1">Excluding audited reversals</div>
      </div>

      {/* Filters and Search */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by category or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Category:</label>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input py-2 text-xs font-medium w-full sm:w-52"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading expense records...</div>
      ) : error ? (
        <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>Error loading expenses: {error.message}</span>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description={searchTerm || categoryFilter ? "No expenses match the filters." : "Record your first expense transaction."}
          action={
            <button onClick={openCreateModal} className="btn">
              <Plus size={16} /> Record Expense
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">Category</th>
                  <th className="table-th">Client</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Receipt</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e._id} className={`hover:bg-slate-50/70 transition ${e.status === "Reversed" ? "opacity-60 bg-slate-50/50" : ""}`}>
                    <td className="table-td font-semibold text-slate-900">{e.category}</td>
                    <td className="table-td text-slate-600">{e.client?.name || "-"}</td>
                    <td className="table-td font-bold text-amber-700">{formatMoney(e.amount || (e.amountInCents / 100))}</td>
                    <td className="table-td text-xs text-slate-500">{formatDate(e.date)}</td>
                    <td className="table-td text-xs">
                      {e.receiptUrl ? (
                        <a
                          href={e.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          View <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={e.status === "Reversed" ? "Reversed" : "Posted"} />
                    </td>
                    <td className="table-td text-right">
                      {e.status !== "Reversed" && (
                        <button
                          onClick={() => openReverseModal(e)}
                          title="Reverse Expense (Audited)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition inline-flex items-center gap-1 text-xs"
                        >
                          <RotateCcw size={14} /> Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Record Expense">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Client *</label>
            <select
              required
              value={formData.client}
              onChange={e => setFormData({ ...formData, client: e.target.value })}
              className="input"
            >
              <option value="" disabled>Select client...</option>
              {(clients || []).map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Project</label>
            <select
              value={formData.project}
              onChange={e => setFormData({ ...formData, project: e.target.value })}
              className="input"
            >
              <option value="">None (Agency overhead)</option>
              {(projects || []).map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="input"
                placeholder="450.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="input"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt URL (HTTPS)</label>
              <input
                type="url"
                value={formData.receiptUrl}
                onChange={e => setFormData({ ...formData, receiptUrl: e.target.value })}
                className="input"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Saving..." : "Record Expense"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reversal Modal */}
      <Modal
        isOpen={reverseModalOpen}
        onClose={() => setReverseModalOpen(false)}
        title="Audited Expense Reversal"
      >
        <form onSubmit={handleReverse} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <p className="text-xs text-slate-600">
            Reversing this expense updates the audit trail and deducts the amount from financial calculations without mutating ledger history.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reversal Reason *</label>
            <textarea
              required
              rows={3}
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              className="input"
              placeholder="e.g. Refund received from vendor, incorrect allocation..."
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setReverseModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-danger">
              {submitting ? "Reversing..." : "Confirm Reversal"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
