import { sendSuccess } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";
import Expense from "../models/Expense.js";

export const create = async (req, res) => {
  const doc = await Expense.create({ ...req.body, workspace: req.workspaceId });
  sendSuccess(res, doc, "Expense created", 201);
};

export const list = async (req, res) => {
  const query = { workspace: req.workspaceId };
  if (req.query.status) query.status = req.query.status;
  const docs = await Expense.find(query).sort({ createdAt: -1 }).limit(100).populate("client", "name industry status");
  sendSuccess(res, docs, "Expense list");
};

export const getById = async (req, res, next) => {
  const doc = await Expense.findOne({ _id: req.params.id, workspace: req.workspaceId }).populate("client", "name industry status");
  if (!doc) return next(new AppError("Expense not found", 404));
  sendSuccess(res, doc, "Expense loaded");
};

export const update = async (req, res, next) => {
  const doc = await Expense.findOneAndUpdate({ _id: req.params.id, workspace: req.workspaceId }, req.body, { new: true });
  if (!doc) return next(new AppError("Expense not found", 404));
  sendSuccess(res, doc, "Expense updated");
};

export const remove = async (req, res, next) => {
  const doc = await Expense.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
  if (!doc) return next(new AppError("Expense not found", 404));
  sendSuccess(res, null, "Expense deleted");
};
