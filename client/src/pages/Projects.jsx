import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Modal from "../components/shared/Modal";
import { formatMoney, formatDate } from "../lib/formatters";
import { api } from "../services/api";
import { FolderKanban, Plus, Search, Edit, Eye, AlertCircle, Calendar } from "lucide-react";

export default function Projects() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    client: "",
    budget: "",
    deadline: "",
    status: "Planning"
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then(r => r.data.data)
  });

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects", statusFilter],
    queryFn: () => {
      const url = statusFilter ? `/projects?status=${encodeURIComponent(statusFilter)}` : "/projects";
      return api.get(url).then(r => r.data.data);
    }
  });

  const filteredProjects = (projects || []).filter(p => {
    const matchesSearch = searchTerm
      ? p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesSearch;
  });

  function openCreateModal() {
    setFormData({
      name: "",
      client: clients?.[0]?._id || "",
      budget: "",
      deadline: "",
      status: "Planning"
    });
    setFormError("");
    setCreateModalOpen(true);
  }

  function openEditModal(project) {
    setSelectedProject(project);
    setFormData({
      name: project.name || "",
      client: project.client?._id || project.client || "",
      budget: project.budget !== undefined ? project.budget : "",
      deadline: project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "",
      status: project.status || "Planning"
    });
    setFormError("");
    setEditModalOpen(true);
  }

  function openDetailsModal(project) {
    setSelectedProject(project);
    setDetailsModalOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: formData.name,
        client: formData.client,
        status: formData.status,
        budget: formData.budget ? Number(formData.budget) : 0,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };
      await api.post("/projects", payload);
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["projects"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create project");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!selectedProject) return;
    setFormSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: formData.name,
        status: formData.status,
        budget: formData.budget !== "" ? Number(formData.budget) : 0,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };
      await api.patch(`/projects/${selectedProject._id}`, payload);
      setEditModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["projects"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update project");
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Deliverables & Operations"
        title="Projects"
        description="Track client engagements, budgets, timelines, resource allocations, and milestone delivery."
        action={
          <button onClick={openCreateModal} className="btn">
            <Plus size={16} /> Add Project
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project or client..."
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
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading projects...</div>
      ) : error ? (
        <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>Error loading projects: {error.message}</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description={searchTerm || statusFilter ? "No projects match your filter criteria." : "Create your first project to track agency work."}
          action={
            <button onClick={openCreateModal} className="btn">
              <Plus size={16} /> Add First Project
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">Project</th>
                  <th className="table-th">Client</th>
                  <th className="table-th">Budget</th>
                  <th className="table-th">Deadline</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition">
                    <td className="table-td font-semibold text-slate-900">{p.name}</td>
                    <td className="table-td text-slate-600">
                      {p.client?.name || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="table-td font-medium text-slate-900">{formatMoney(p.budget)}</td>
                    <td className="table-td text-xs text-slate-600">{formatDate(p.deadline)}</td>
                    <td className="table-td">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="table-td text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openDetailsModal(p)}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Project"
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

      {/* Create Project Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g. Website Redesign Q4"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Client *</label>
            <select
              required
              value={formData.client}
              onChange={e => setFormData({ ...formData, client: e.target.value })}
              className="input"
            >
              <option value="" disabled>Select a client...</option>
              {(clients || []).map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Budget ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: e.target.value })}
                className="input"
                placeholder="5000.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              className="input"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={formSubmitting} className="btn">
              {formSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Project">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Budget ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: e.target.value })}
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
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
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

      {/* Project Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedProject?.name || "Project Details"}
        subtitle={`Client: ${selectedProject?.client?.name || "Unassigned"}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Status</div>
              <div className="mt-1"><StatusBadge status={selectedProject?.status} /></div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Budget Allocated</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{formatMoney(selectedProject?.budget)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Deadline</div>
              <div className="text-xs font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                {formatDate(selectedProject?.deadline)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Currency</div>
              <div className="text-xs font-bold text-slate-700 mt-1">{selectedProject?.currency || "USD"}</div>
            </div>
          </div>

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
