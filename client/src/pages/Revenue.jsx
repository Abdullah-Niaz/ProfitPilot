import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Modal from "../components/shared/Modal";
import { formatMoney, formatDate } from "../lib/formatters";
import { api } from "../services/api";
import { Briefcase, Plus, Search, RotateCcw, AlertCircle } from "lucide-react";

export default function Revenue() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState(null);

  const [formData, setFormData] = useState({
    client: "",
    project: "",
    amount: "",
    type: "One-Time Payment",
    paymentStatus: "Paid",
    paymentMethod: "Bank Transfer",
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

  const { data: revenues, isLoading, error } = useQuery({
    queryKey: ["revenue", statusFilter],
    queryFn: () => {
      const url = statusFilter ? `/revenue?status=${encodeURIComponent(statusFilter)}` : "/revenue";
      return api.get(url).then(r => r.data.data);
    }
  });

  const filteredRevenues = (revenues || []).filter(r => {
    const matchesSearch = searchTerm
      ? r.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesSearch;
  });

  const totalPaid = (revenues || [])
    .filter(r => r.status !== "Reversed" && r.paymentStatus === "Paid")
    .reduce((acc, r) => acc + (r.amountInCents || (r.amount * 100) || 0), 0) / 100;

  const totalPending = (revenues || [])
    .filter(r => r.status !== "Reversed" && r.paymentStatus === "Pending")
    .reduce((acc, r) => acc + (r.amountInCents || (r.amount * 100) || 0), 0) / 100;

  function openCreateModal() {
    setFormData({
      client: clients?.[0]?._id || "",
      project: "",
      amount: "",
      type: "One-Time Payment",
      paymentStatus: "Paid",
      paymentMethod: "Bank Transfer",
      date: new Date().toISOString().split("T")[0]
    });
    setFormError("");
    setCreateModalOpen(true);
  }

  function openReverseModal(rev) {
    setSelectedRevenue(rev);
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
        type: formData.type,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod || undefined,
        date: new Date(formData.date).toISOString()
      };
      await api.post("/revenue", payload);
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["revenue"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["overview"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["monthly-profit"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add revenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReverse(e) {
    e.preventDefault();
    if (!selectedRevenue) return;
    setSubmitting(true);
    setFormError("");
    try {
      await api.post(`/revenue/${selectedRevenue._id}/reverse`, { reason: reversalReason });
      setReverseModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["revenue"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["overview"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["monthly-profit"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to reverse revenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Cash & Accrual Earnings"
        title="Revenue"
        description="Record incoming cash flows, monthly retainers, milestone payments, and audited reversals."
        action={
          <button onClick={openCreateModal} className="btn">
            <Plus size={16} /> Add Revenue
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Settled Cash</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatMoney(totalPaid)}</div>
          <div className="text-xs text-slate-400 mt-1">Cleared receipts excluding reversals</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending / Uncollected</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{formatMoney(totalPending)}</div>
          <div className="text-xs text-slate-400 mt-1">Accrued or pipeline revenue</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client or type..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Payment Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input py-2 text-xs font-medium w-full sm:w-44"
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading revenue records...</div>
      ) : error ? (
        <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>Error loading revenue: {error.message}</span>
        </div>
      ) : filteredRevenues.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No revenue entries found"
          description={searchTerm || statusFilter ? "No revenue matches the filters." : "Record your first revenue transaction."}
          action={
            <button onClick={openCreateModal} className="btn">
              <Plus size={16} /> Record First Revenue
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">Client</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Method</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenues.map(r => (
                  <tr key={r._id} className={`hover:bg-slate-50/70 transition ${r.status === "Reversed" ? "opacity-60 bg-slate-50/50" : ""}`}>
                    <td className="table-td font-semibold text-slate-900">{r.client?.name || "-"}</td>
                    <td className="table-td text-xs text-slate-600">{r.type}</td>
                    <td className="table-td font-bold text-slate-900">{formatMoney(r.amount || (r.amountInCents / 100))}</td>
                    <td className="table-td text-xs text-slate-500">{formatDate(r.date)}</td>
                    <td className="table-td text-xs text-slate-600">{r.paymentMethod || "-"}</td>
                    <td className="table-td">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={r.status === "Reversed" ? "Reversed" : r.paymentStatus} />
                      </div>
                    </td>
                    <td className="table-td text-right">
                      {r.status !== "Reversed" && !r.payment && (
                        <button
                          onClick={() => openReverseModal(r)}
                          title="Reverse Entry (Audited)"
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

      {/* Add Revenue Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Record Revenue">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client *</label>
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
              <option value="">None (Agency-level)</option>
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
                placeholder="1500.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Type *</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="input"
              >
                <option value="One-Time Payment">One-Time Payment</option>
                <option value="Monthly Retainer">Monthly Retainer</option>
                <option value="Milestone Payment">Milestone Payment</option>
                <option value="Subscription">Subscription</option>
                <option value="Maintenance Fee">Maintenance Fee</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={formData.paymentStatus}
                onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="input"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <input
                type="text"
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="input"
                placeholder="e.g. Wire, Stripe, ACH"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="input"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Saving..." : "Record Revenue"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reversal Modal */}
      <Modal
        isOpen={reverseModalOpen}
        onClose={() => setReverseModalOpen(false)}
        title="Audited Revenue Reversal"
      >
        <form onSubmit={handleReverse} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <p className="text-xs text-slate-600">
            Reversing this entry preserves accounting integrity. The entry will be marked as reversed in the audit trail and excluded from all future revenue totals.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reversal Reason *</label>
            <textarea
              required
              rows={3}
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              className="input"
              placeholder="e.g. Invoice disputed, duplicate entry, client refund issued..."
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
