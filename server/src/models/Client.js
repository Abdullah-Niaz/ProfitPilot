import mongoose from "mongoose";
const clientSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: String,
  phone: String,
  industry: String,
  status: { type: String, enum: ["Active", "At Risk", "Profitable", "Low Margin", "Loss Making", "Archived"], default: "Active" },
  notes: String
}, { timestamps: true });
clientSchema.index({ workspace: 1, name: 1 });
export default mongoose.model("Client", clientSchema);
