import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
  amount: { type: Number, required: true, min: 0 },
  amountInCents: { type: Number, required: true, min: 0 },
  currency: { type: String, uppercase: true, trim: true, default: "USD" },
  category: {
    type: String,
    enum: ["Team Salary", "Freelancer Cost", "Software Subscription", "Hosting", "Marketing", "Operations", "Client-Specific Cost", "Miscellaneous"],
    required: true
  },
  receiptUrl: { type: String, trim: true },
  date: { type: Date, default: Date.now, index: true },
  effectiveDate: { type: Date, default: Date.now, index: true },
  settledDate: { type: Date, default: null },
  status: { type: String, enum: ["Posted", "Reversed"], default: "Posted", index: true },
  reversedAt: { type: Date, default: null },
  reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reversalReason: { type: String, default: null }
}, { timestamps: true });

expenseSchema.pre("validate", function(next) {
  if (this.amount !== undefined && this.amountInCents === undefined) {
    this.amountInCents = Math.round(this.amount * 100);
  } else if (this.amountInCents !== undefined && this.amount === undefined) {
    this.amount = this.amountInCents / 100;
  } else if (this.amount !== undefined && this.amountInCents !== undefined) {
    this.amountInCents = Math.round(this.amount * 100);
  }
  if (!this.effectiveDate && this.date) {
    this.effectiveDate = this.date;
  }
  if (!this.settledDate) {
    this.settledDate = this.date || new Date();
  }
  next();
});

expenseSchema.index({ workspace: 1, date: -1 });
expenseSchema.index({ workspace: 1, status: 1 });
expenseSchema.index({ workspace: 1, client: 1 });
expenseSchema.index({ workspace: 1, project: 1 });
expenseSchema.index({ workspace: 1, category: 1 });

export default mongoose.model("Expense", expenseSchema);
