import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Modal from "../components/shared/Modal";
import { formatMoney, formatDate } from "../lib/formatters";
import { api } from "../services/api";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Send,
  Ban,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Receipt
} from "lucide-react";

export default function Invoices() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    client: "",
    project: "",
    invoiceNo: "",
    totalAmount: "",
    dueDate: "",
    notes: ""
  });
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "Bank Transfer",
    reference: "",
    notes: ""
  });
  const [voidReason, setVoidReason] = useState("");
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

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: () => {
      const url = statusFilter ? `/invoices?status=${encodeURIComponent(statusFilter)}` : "/invoices";
      return api.get(url).then(r => r.data.data);
    }
  });

  // Invoice detailed info including payment history
  const { data: detailedInvoiceData, refetch: refetchDetails } = useQuery({
    queryKey: ["invoice-detail", selectedInvoice?._id],
    queryFn: () => api.get(`/invoices/${selectedInvoice._id}`).then(r => r.data.data),
    enabled: !!selectedInvoice?._id && detailsModalOpen
  });

  const filteredInvoices = (invoices || []).filter(inv => {
    const matchesSearch = searchTerm
      ? inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesSearch;
  });

  // Summary totals
  const totalBilled = (invoices || []).reduce((acc, i) => i.status !== "Void" ? acc + (i.totalAmountInCents || 0) : acc, 0) / 100;
  const totalCollected = (invoices || []).reduce((acc, i) => i.status !== "Void" ? acc + (i.amountPaidInCents || 0) : acc, 0) / 100;
  const totalOutstanding = (invoices || []).reduce((acc, i) => ["Sent", "Partially Paid", "Overdue"].includes(i.status) ? acc + (i.balanceDueInCents || 0) : acc, 0) / 100;

  function openCreateModal() {
    setFormData({
      client: clients?.[0]?._id || "",
      project: "",
      invoiceNo: "",
      totalAmount: "",
      dueDate: "",
      notes: ""
    });
    setFormError("");
    setCreateModalOpen(true);
  }

  function openDetailsModal(invoice) {
    setSelectedInvoice(invoice);
    setDetailsModalOpen(true);
  }

  function openPaymentModal(invoice) {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.balanceDue !== undefined ? invoice.balanceDue : (invoice.balanceDueInCents / 100),
      paymentMethod: "Bank Transfer",
      reference: "",
      notes: ""
    });
    setFormError("");
    setPaymentModalOpen(true);
  }

  function openVoidModal(invoice) {
    setSelectedInvoice(invoice);
    setVoidReason("");
    setFormError("");
    setVoidModalOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        client: formData.client,
        project: formData.project || undefined,
        invoiceNo: formData.invoiceNo || undefined,
        totalAmount: Number(formData.totalAmount),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        notes: formData.notes || undefined
      };
      await api.post("/invoices", payload);
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["invoices"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendInvoice(invoiceId) {
    setSubmitting(true);
    try {
      await api.post(`/invoices/${invoiceId}/send`);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["invoices"].includes(q.queryKey[3]) });
      if (detailsModalOpen) refetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send invoice");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    setFormError("");
    try {
      await api.post("/payments", {
        invoice: selectedInvoice._id,
        amount: Number(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference || undefined,
        notes: paymentData.notes || undefined
      });
      setPaymentModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["invoices"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["revenue"].includes(q.queryKey[3]) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["overview"].includes(q.queryKey[3]) });
      if (detailsModalOpen) refetchDetails();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoidInvoice(e) {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);
    setFormError("");
    try {
      await api.post(`/invoices/${selectedInvoice._id}/void`, { reason: voidReason });
      setVoidModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["invoices"].includes(q.queryKey[3]) });
      if (detailsModalOpen) refetchDetails();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to void invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Billing & Accounts Receivable"
        title="Invoices"
        description="Issue client invoices, track partial payments, reconcile balances, and manage audit status."
        action={
          <button onClick={openCreateModal} className="btn">
            <Plus size={16} /> Create Invoice
          </button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatMoney(totalBilled)}</div>
          <div className="text-xs text-slate-400 mt-1">Across all issued billing</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Collected Cash</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatMoney(totalCollected)}</div>
          <div className="text-xs text-slate-400 mt-1">Settled payments received</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Outstanding Balance</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{formatMoney(totalOutstanding)}</div>
          <div className="text-xs text-slate-400 mt-1">Pending client collection</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice # or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input py-2 text-xs font-medium w-full sm:w-44"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Void">Void</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading invoices...</div>
      ) : error ? (
        <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>Error loading invoices: {error.message}</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={searchTerm || statusFilter ? "No invoices match the filter." : "Create and send your first client invoice."}
          action={
            <button onClick={openCreateModal} className="btn">
              <Plus size={16} /> Create Invoice
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">Invoice #</th>
                  <th className="table-th">Client</th>
                  <th className="table-th">Issue Date</th>
                  <th className="table-th">Due Date</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Balance Due</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-slate-50/70 transition">
                    <td className="table-td font-bold text-slate-900">{inv.invoiceNo}</td>
                    <td className="table-td text-slate-600">{inv.client?.name || "-"}</td>
                    <td className="table-td text-xs text-slate-500">{formatDate(inv.issueDate)}</td>
                    <td className="table-td text-xs text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="table-td font-semibold text-slate-900">{formatMoney(inv.amount || (inv.totalAmountInCents / 100))}</td>
                    <td className="table-td font-bold text-amber-700">
                      {formatMoney(inv.balanceDue !== undefined ? inv.balanceDue : (inv.balanceDueInCents / 100))}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="table-td text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openDetailsModal(inv)}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Eye size={16} />
                        </button>
                        {inv.status === "Draft" && (
                          <button
                            onClick={() => handleSendInvoice(inv._id)}
                            title="Send Invoice"
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        {["Sent", "Partially Paid", "Overdue"].includes(inv.status) && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            title="Record Payment"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        {inv.status === "Sent" && (
                          <button
                            onClick={() => openVoidModal(inv)}
                            title="Void Invoice"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Invoice">
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
          <div className="grid sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Invoice # (optional)</label>
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                className="input"
                placeholder="e.g. INV-2026-001"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount ($) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={formData.totalAmount}
                onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                className="input"
                placeholder="2500.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Instructions / Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              placeholder="Bank wire details, Net-30 terms, etc."
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Creating..." : "Save Draft Invoice"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoice?.invoiceNo}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex justify-between">
            <span>Remaining Balance Due:</span>
            <span className="font-bold text-amber-700">
              {formatMoney(selectedInvoice?.balanceDue !== undefined ? selectedInvoice.balanceDue : (selectedInvoice?.balanceDueInCents / 100))}
            </span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ($) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={paymentData.amount}
              onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentData.paymentMethod}
                onChange={e => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                className="input"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Stripe">Stripe</option>
                <option value="PayPal">PayPal</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Transaction ID</label>
              <input
                type="text"
                value={paymentData.reference}
                onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                className="input"
                placeholder="e.g. ch_3M..."
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setPaymentModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Posting..." : "Post Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Void Invoice Modal */}
      <Modal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title={`Void Invoice ${selectedInvoice?.invoiceNo}`}
      >
        <form onSubmit={handleVoidInvoice} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Voiding an invoice cancels it in the audit ledger. Voided invoices cannot be paid.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Voiding *</label>
            <textarea
              required
              rows={3}
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              className="input"
              placeholder="e.g. Issued in error, terms revised..."
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setVoidModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-danger">
              {submitting ? "Voiding..." : "Confirm Void"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Details & Audit Ledger Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedInvoice?.invoiceNo || "Invoice Details"}
        subtitle={`Client: ${selectedInvoice?.client?.name || "Client"}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Status</div>
              <div className="mt-1"><StatusBadge status={detailedInvoiceData?.invoice?.status || selectedInvoice?.status} /></div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Total Billed</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {formatMoney(selectedInvoice?.amount || (selectedInvoice?.totalAmountInCents / 100))}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Paid to Date</div>
              <div className="text-sm font-bold text-emerald-700 mt-1">
                {formatMoney(detailedInvoiceData?.invoice?.amountPaid || (selectedInvoice?.amountPaidInCents / 100))}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Balance Due</div>
              <div className="text-sm font-bold text-amber-700 mt-1">
                {formatMoney(detailedInvoiceData?.invoice?.balanceDue || (selectedInvoice?.balanceDueInCents / 100))}
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Receipt size={16} className="text-blue-600" /> Recorded Payments
            </h4>
            {detailedInvoiceData?.payments?.length ? (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedInvoiceData.payments.map(p => (
                      <tr key={p._id} className="border-t border-slate-100">
                        <td className="p-3 text-slate-500">{formatDate(p.paidAt)}</td>
                        <td className="p-3 font-medium text-slate-800">{p.paymentMethod}</td>
                        <td className="p-3 text-slate-500">{p.reference || "-"}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{formatMoney(p.amount || (p.amountInCents / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-400 bg-slate-50 rounded-xl">No payments recorded yet.</div>
            )}
          </div>

          {selectedInvoice?.notes && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">Notes & Terms</div>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                {selectedInvoice.notes}
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center">
            <div>
              {selectedInvoice?.status === "Draft" && (
                <button
                  onClick={() => handleSendInvoice(selectedInvoice._id)}
                  disabled={submitting}
                  className="btn bg-blue-600 hover:bg-blue-700"
                >
                  <Send size={14} /> Send to Client
                </button>
              )}
              {["Sent", "Partially Paid", "Overdue"].includes(selectedInvoice?.status) && (
                <button
                  onClick={() => openPaymentModal(selectedInvoice)}
                  className="btn bg-emerald-600 hover:bg-emerald-700"
                >
                  <DollarSign size={14} /> Record Payment
                </button>
              )}
            </div>
            <button onClick={() => setDetailsModalOpen(false)} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

