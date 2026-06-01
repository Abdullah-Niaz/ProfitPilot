import mongoose from "mongoose";
const auditLogSchema = new mongoose.Schema({ workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", index: true }, actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, action: String, entity: String, entityId: String, metadata: Object }, { timestamps: true });
export default mongoose.model("AuditLog", auditLogSchema);
