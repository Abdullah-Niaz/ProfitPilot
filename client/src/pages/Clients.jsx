import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Modal from "../components/shared/Modal";
import { formatMoney, formatPercent } from "../lib/formatters";
import { api } from "../services/api";
import { Building2, Edit, Eye, Plus, Search, TrendingUp, AlertCircle } from "lucide-react";

export default function Clients() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    industry: "",
    status: "Active",
    notes: ""
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients", statusFilter],
    queryFn: () => {
      const url = statusFilter ? `/clients?status=${encodeURIComponent(statusFilter)}` : "/clients";
      return api.get(url).then(r => r.data.data);
    }
  });

  // Client profitability query for details modal
  const { data: profitability, isLoading: loadingProfitability } = useQuery({
    queryKey: ["client-profitability", selectedClient?._id],
    queryFn: () => api.get(`/clients/${selectedClient._id}/profitability`).then(r => r.data.data),
    enabled: !!selectedClient?._id && detailsModalOpen
  });

  const filteredClients = (clients || []).filter(c => {
    const matchesSearch = searchTerm
      ? c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesSearch;
  });

  function openCreateModal() {
    setFormData({ name: "", email: "", phone: "", industry: "", status: "Active", notes: "" });
    setFormError("");
    setCreateModalOpen(true);
  }

  function openEditModal(client) {
    setSelectedClient(client);
    setFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      industry: client.industry || "",
      status: client.status || "Active",
      notes: client.notes || ""
    });
    setFormError("");
    setEditModalOpen(true);
  }

  function openDetailsModal(client) {
    setSelectedClient(client);
    setDetailsModalOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError("");
    try {
      await api.post("/clients", formData);
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["clients"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create client");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!selectedClient) return;
    setFormSubmitting(true);
    setFormError("");
    try {
      await api.patch(`/clients/${selectedClient._id}`, formData);
      setEditModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["clients"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update client");
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Relationship Management"
        title="Clients"
        description="Monitor client portfolios, industry sectors, lifecycle stages, and account-level profitability."
        action={
          <button onClick={openCreateModal} className="btn">
            <Plus size={16} /> Add Client
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client or industry..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input py-2 text-xs font-medium w-full sm:w-44"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Profitable">Profitable</option>
            <option value="At Risk">At Risk</option>
            <option value="Low Margin">Low Margin</option>
            <option value="Loss Making">Loss Making</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Table or State */}
      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading clients...</div>
      ) : error ? (
        <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>Error loading clients: {error.message}</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients found"
          description={searchTerm || statusFilter ? "No clients match your filter criteria." : "Get started by adding your first client."}
          action={
            <button onClick={openCreateModal} className="btn">
              <Plus size={16} /> Add First Client
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
                  <th className="table-th">Industry</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition">
                    <td className="table-td font-semibold text-slate-900">{c.name}</td>
                    <td className="table-td">{c.industry || <span className="text-slate-400">-</span>}</td>
                    <td className="table-td text-xs">
                      <div>{c.email || <span className="text-slate-400">No email</span>}</div>
                      {c.phone && <div className="text-slate-400">{c.phone}</div>}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="table-td text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openDetailsModal(c)}
                          title="View Profitability"
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Client"
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add New Client">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g. Acme Corporation"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="billing@acme.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                className="input"
                placeholder="e.g. SaaS, FinTech, Retail"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="Active">Active</option>
                <option value="Profitable">Profitable</option>
                <option value="At Risk">At Risk</option>
                <option value="Low Margin">Low Margin</option>
                <option value="Loss Making">Loss Making</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              placeholder="Key stakeholders, service requirements, payment terms..."
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={formSubmitting} className="btn">
              {formSubmitting ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Client">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="Active">Active</option>
                <option value="Profitable">Profitable</option>
                <option value="At Risk">At Risk</option>
                <option value="Low Margin">Low Margin</option>
                <option value="Loss Making">Loss Making</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={formSubmitting} className="btn">
              {formSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Details & Profitability Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedClient?.name || "Client Details"}
        subtitle={selectedClient?.industry ? `Industry: ${selectedClient.industry}` : "Client Overview"}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="text-xs text-slate-500 font-medium">Status</div>
              <div className="mt-1"><StatusBadge status={selectedClient?.status} /></div>
            </div>
            {selectedClient?.email && (
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Contact</div>
                <div className="text-xs font-semibold text-slate-800 mt-1">{selectedClient.email}</div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> Financial Performance
            </h4>
            {loadingProfitability ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">Calculating metrics...</div>
            ) : profitability ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500">Total Revenue</div>
                  <div className="text-base font-bold text-slate-900">{formatMoney(profitability.revenue)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500">Total Costs</div>
                  <div className="text-base font-bold text-amber-700">{formatMoney(profitability.expenses)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500">Net Profit</div>
                  <div className={`text-base font-bold ${profitability.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatMoney(profitability.profit)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] text-slate-500">Profit Margin</div>
                  <div className="text-base font-bold text-blue-700">{formatPercent(profitability.margin)}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-400 bg-slate-50 rounded-xl">No financial records recorded yet.</div>
            )}
          </div>

          {selectedClient?.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-1">Notes</h4>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                {selectedClient.notes}
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button onClick={() => setDetailsModalOpen(false)} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
