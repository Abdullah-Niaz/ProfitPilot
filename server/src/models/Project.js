import mongoose from "mongoose";
const projectSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  name: { type: String, required: true, trim: true },
  budget: { type: Number, default: 0 },
  deadline: Date,
  status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed", "Cancelled"], default: "Planning" },
  assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });
export default mongoose.model("Project", projectSchema);
