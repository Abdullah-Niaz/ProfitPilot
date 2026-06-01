import mongoose from "mongoose";
const aiInsightSchema = new mongoose.Schema({ workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", index: true }, client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" }, type: { type: String, enum: ["Retain", "Upsell", "Renegotiate", "Monitor", "Drop"] }, score: Number, summary: String, recommendation: String }, { timestamps: true });
export default mongoose.model("AIInsight", aiInsightSchema);
