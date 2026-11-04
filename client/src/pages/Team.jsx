import VerificationNotice from '../components/shared/VerificationNotice';
import React, { useState } from "react";
import { useWorkspaceQuery as useQuery } from "../app/useWorkspaceQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import PageHeader from "../components/shared/PageHeader";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import Modal from "../components/shared/Modal";
import { formatDate } from "../lib/formatters";
import { api } from "../services/api";
import { UserPlus, Users, Trash2, Mail, Shield, AlertCircle } from "lucide-react";

export default function Team() {
  const queryClient = useQueryClient();
  const currentRole = useSelector(state => state.auth.role);
  const currentUserId = useSelector(state => state.auth.user?.id);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: "", role: "Team Member" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [invitationLink,setInvitationLink]=useState("");

  const { data: workspaceData, isLoading, error } = useQuery({
    queryKey: ["current-workspace"],
    queryFn: () => api.get("/workspaces/current").then(r => r.data.data)
  });

  const workspace = workspaceData?.workspace;
  const members = workspaceData?.members || [];
  const role = members.find(m => m.user?._id === currentUserId)?.role || currentRole;
  const canManage = ["Owner", "Admin"].includes(role);

  function openInviteModal() {
    setFormData({ email: "", role: "Team Member" });
    setFormError("");
    setInviteModalOpen(true);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const response=await api.post("/workspaces/current/invitations", formData);
      setInvitationLink(response.data.data.developmentLink || "");
      setInviteModalOpen(false);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["current-workspace"].includes(q.queryKey[3]) });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to invite member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveMember(memberId, name) {
    if (!window.confirm(`Are you sure you want to remove ${name || "this member"} from the workspace?`)) return;
    try {
      await api.delete(`/workspaces/current/members/${memberId}`);
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'workspace' && ["current-workspace"].includes(q.queryKey[3]) });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  }

  return (
    <>
      <VerificationNotice />
      {invitationLink && <a className="block mb-4 underline" href={invitationLink}>Open local invitation preview</a>}
      <PageHeader
        eyebrow="Organization & Governance"
        title="Team & Workspace"
        description="Manage workspace members, assign role-based permissions, and invite collaborators."
        action={
          canManage && (
            <button onClick={openInviteModal} className="btn">
              <UserPlus size={16} /> Invite Member
            </button>
          )
        }
      />

      {/* Workspace Overview Card */}
      {workspace && (
        <div className="card p-5 mb-6 grid sm:grid-cols-3 gap-4 border-slate-200">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workspace Name</div>
            <div className="text-base font-bold text-slate-900 mt-1">{workspace.name}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Default Currency</div>
            <div className="text-base font-bold text-blue-600 mt-1">{workspace.currency || "USD"}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Timezone</div>
            <div className="text-base font-semibold text-slate-700 mt-1">{workspace.timezone || "UTC"}</div>
          </div>
        </div>
      )}

      {/* Team Members List */}
      {isLoading ? (
        <div className="card p-12 text-center text-slate-400">Loading team members...</div>
      ) : error ? (
        <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>Error loading team: {error.message}</span>
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members found"
          description="Invite team members to collaborate on client engagements and agency finances."
          action={
            canManage && (
              <button onClick={openInviteModal} className="btn">
                <UserPlus size={16} /> Invite Member
              </button>
            )
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Joined</th>
                  {canManage && <th className="table-th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const isSelf = String(m.user?._id) === String(currentUserId);
                  const isOwner = m.role === "Owner";
                  return (
                    <tr key={m._id} className="hover:bg-slate-50/70 transition">
                      <td className="table-td font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 uppercase">
                            {m.user?.name?.[0] || "U"}
                          </div>
                          <div>
                            <div>{m.user?.name || "Invited User"}</div>
                            {isSelf && <span className="text-[10px] text-blue-600 font-bold">(You)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-xs text-slate-600">{m.user?.email || "-"}</td>
                      <td className="table-td">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Shield size={12} className="text-slate-400" />
                          {m.role}
                        </span>
                      </td>
                      <td className="table-td">
                        <StatusBadge status={m.status === "active" ? "Active" : m.status === "invited" ? "Pending" : "Cancelled"} />
                      </td>
                      <td className="table-td text-xs text-slate-500">{formatDate(m.createdAt)}</td>
                      {canManage && (
                        <td className="table-td text-right">
                          {!isOwner && !isSelf && (
                            <button
                              onClick={() => handleRemoveMember(m._id, m.user?.name)}
                              title="Remove member"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Colleague Email *</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="input pl-10"
                placeholder="colleague@agency.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role *</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="input"
            >
              <option value="Admin">Admin (Full agency settings & finances)</option>
              <option value="Manager">Manager (Projects, clients & entries)</option>
              <option value="Accountant">Accountant (Invoicing & ledgers)</option>
              <option value="Team Member">Team Member (Read-only operations)</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setInviteModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

