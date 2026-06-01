import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({ workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", index: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, title: String, message: String, read: { type: Boolean, default: false } }, { timestamps: true });
export default mongoose.model("Notification", notificationSchema);
