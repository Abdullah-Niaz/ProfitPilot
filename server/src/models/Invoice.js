import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, min: 0 },
  unitPriceInCents: { type: Number, min: 0 },
  amountInCents: { type: Number, min: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
  invoiceNo: { type: String, required: true, trim: true },
  currency: { type: String, uppercase: true, trim: true, default: "USD" },
  amount: { type: Number, min: 0 },
  totalAmountInCents: { type: Number, required: true, min: 1 },
  amountPaid: { type: Number, default: 0, min: 0 },
  amountPaidInCents: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, min: 0 },
  balanceDueInCents: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Void"],
    default: "Draft",
    index: true
  },
  issueDate: { type: Date, default: Date.now, index: true },
  dueDate: { type: Date, index: true },
  lineItems: [lineItemSchema],
  notes: { type: String, trim: true },
  voidedAt: { type: Date, default: null },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  voidReason: { type: String, default: null }
}, { timestamps: true });

invoiceSchema.pre("validate", function(next) {
  if (this.totalAmountInCents === undefined && this.amount !== undefined) {
    this.totalAmountInCents = Math.round(this.amount * 100);
  }
  if (this.totalAmountInCents !== undefined && this.amount === undefined) {
    this.amount = this.totalAmountInCents / 100;
  }
  if (this.amountPaidInCents === undefined && this.amountPaid !== undefined) {
    this.amountPaidInCents = Math.round(this.amountPaid * 100);
  } else if (this.amountPaidInCents === undefined) {
    this.amountPaidInCents = 0;
  }
  this.amountPaid = this.amountPaidInCents / 100;

  if (this.balanceDueInCents === undefined) {
    this.balanceDueInCents = Math.max(0, this.totalAmountInCents - this.amountPaidInCents);
  }
  this.balanceDue = this.balanceDueInCents / 100;

  next();
});

invoiceSchema.index({ workspace: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ workspace: 1, status: 1 });
invoiceSchema.index({ workspace: 1, client: 1 });
invoiceSchema.index({ workspace: 1, dueDate: 1 });
invoiceSchema.index({ workspace: 1, issueDate: -1 });

export default mongoose.model("Invoice", invoiceSchema);
