import mongoose from "mongoose";
const expenseSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, enum: ["Team Salary", "Freelancer Cost", "Software Subscription", "Hosting", "Marketing", "Operations", "Client-Specific Cost", "Miscellaneous"], required: true },
  receiptUrl: String,
  date: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
export default mongoose.model("Expense", expenseSchema);
