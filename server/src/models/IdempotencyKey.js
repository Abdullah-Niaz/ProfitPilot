import mongoose from "mongoose";

const idempotencyKeySchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  key: { type: String, required: true },
  requestHash: { type: String, required: true },
  status: { type: String, enum: ["processing", "completed"], default: "processing", index: true },
  statusCode: { type: Number },
  responseBody: { type: mongoose.Schema.Types.Mixed },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

idempotencyKeySchema.index({ workspace: 1, key: 1 }, { unique: true });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("IdempotencyKey", idempotencyKeySchema);

