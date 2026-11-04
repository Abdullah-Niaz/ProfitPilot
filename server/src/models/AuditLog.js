import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

auditLogSchema.index({ workspace: 1, createdAt: -1 });
auditLogSchema.index({ workspace: 1, entity: 1, entityId: 1 });

export default mongoose.model("AuditLog", auditLogSchema);
