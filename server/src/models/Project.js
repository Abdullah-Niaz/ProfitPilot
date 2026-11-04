import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  name: { type: String, required: true, trim: true },
  budget: { type: Number, default: 0, min: 0 },
  budgetInCents: { type: Number, default: 0, min: 0 },
  currency: { type: String, uppercase: true, trim: true, default: "USD" },
  deadline: Date,
  status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed", "Cancelled"], default: "Planning" },
  assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

projectSchema.pre("validate", function(next) {
  if (this.budget !== undefined && this.budgetInCents === undefined) {
    this.budgetInCents = Math.round(this.budget * 100);
  } else if (this.budgetInCents !== undefined && this.budget === undefined) {
    this.budget = this.budgetInCents / 100;
  } else if (this.budget !== undefined && this.budgetInCents !== undefined) {
    this.budgetInCents = Math.round(this.budget * 100);
  }
  next();
});

projectSchema.index({ workspace: 1, client: 1 });
projectSchema.index({ workspace: 1, status: 1 });

export default mongoose.model("Project", projectSchema);
