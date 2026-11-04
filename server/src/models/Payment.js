import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", index: true },
  amount: { type: Number, required: true, min: 0 },
  amountInCents: { type: Number, required: true, min: 1 },
  currency: { type: String, uppercase: true, trim: true, default: "USD" },
  paymentMethod: {
    type: String,
    enum: ["Bank Transfer", "Credit Card", "Cash", "Stripe", "PayPal", "Check", "Other"],
    default: "Bank Transfer"
  },
  reference: { type: String, trim: true },
  paidAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ["Posted", "Reversed"], default: "Posted", index: true },
  notes: { type: String, trim: true },
  reversedAt: { type: Date, default: null },
  reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reversalReason: { type: String, default: null },
  reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null }
}, { timestamps: true });

paymentSchema.pre("validate", function(next) {
  if (this.amount !== undefined && this.amountInCents === undefined) {
    this.amountInCents = Math.round(this.amount * 100);
  } else if (this.amountInCents !== undefined && this.amount === undefined) {
    this.amount = this.amountInCents / 100;
  } else if (this.amount !== undefined && this.amountInCents !== undefined) {
    this.amountInCents = Math.round(this.amount * 100);
  }
  next();
});

paymentSchema.index({ workspace: 1, invoice: 1 });
paymentSchema.index({ workspace: 1, status: 1 });
paymentSchema.index({ workspace: 1, client: 1 });
paymentSchema.index({ workspace: 1, paidAt: -1 });

export default mongoose.model("Payment", paymentSchema);
