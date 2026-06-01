import mongoose from "mongoose";
const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  logo: String,
  industry: String,
  currency: { type: String, default: "USD" },
  timezone: { type: String, default: "UTC" }
}, { timestamps: true });
export default mongoose.model("Workspace", workspaceSchema);
