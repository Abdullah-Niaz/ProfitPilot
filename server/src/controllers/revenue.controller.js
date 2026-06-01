import { sendSuccess } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";
import Revenue from "../models/Revenue.js";

export const create = async (req, res) => {
  const doc = await Revenue.create({ ...req.body, workspace: req.workspaceId });
  sendSuccess(res, doc, "Revenue created", 201);
};

export const list = async (req, res) => {
  const query = { workspace: req.workspaceId };
  if (req.query.status) query.status = req.query.status;
  const docs = await Revenue.find(query).sort({ createdAt: -1 }).limit(100).populate("client", "name industry status");
  sendSuccess(res, docs, "Revenue list");
};

export const getById = async (req, res, next) => {
  const doc = await Revenue.findOne({ _id: req.params.id, workspace: req.workspaceId }).populate("client", "name industry status");
  if (!doc) return next(new AppError("Revenue not found", 404));
  sendSuccess(res, doc, "Revenue loaded");
};

export const update = async (req, res, next) => {
  const doc = await Revenue.findOneAndUpdate({ _id: req.params.id, workspace: req.workspaceId }, req.body, { new: true });
  if (!doc) return next(new AppError("Revenue not found", 404));
  sendSuccess(res, doc, "Revenue updated");
};

export const remove = async (req, res, next) => {
  const doc = await Revenue.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
  if (!doc) return next(new AppError("Revenue not found", 404));
  sendSuccess(res, null, "Revenue deleted");
};
