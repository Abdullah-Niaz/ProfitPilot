import mongoose from "mongoose";
const paymentSchema = new mongoose.Schema({ workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", index: true }, invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }, amount: Number, method: String, paidAt: Date }, { timestamps: true });
export default mongoose.model("Payment", paymentSchema);
