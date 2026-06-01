import mongoose from "mongoose";
const revenueSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ["One-Time Payment", "Monthly Retainer", "Milestone Payment", "Subscription", "Maintenance Fee"], required: true },
  paymentStatus: { type: String, enum: ["Paid", "Pending", "Overdue"], default: "Paid" },
  paymentMethod: String,
  date: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
export default mongoose.model("Revenue", revenueSchema);
