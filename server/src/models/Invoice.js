import mongoose from "mongoose";
const invoiceSchema = new mongoose.Schema({ workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", index: true }, client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" }, invoiceNo: String, amount: Number, status: { type: String, enum: ["Draft", "Sent", "Paid", "Overdue"], default: "Draft" }, dueDate: Date }, { timestamps: true });
export default mongoose.model("Invoice", invoiceSchema);
