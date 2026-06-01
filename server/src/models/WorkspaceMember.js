import mongoose from "mongoose";
const workspaceMemberSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["Owner", "Admin", "Manager", "Accountant", "Team Member"], default: "Team Member" },
  status: { type: String, enum: ["active", "invited", "removed"], default: "active" }
}, { timestamps: true });
workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });
export default mongoose.model("WorkspaceMember", workspaceMemberSchema);
