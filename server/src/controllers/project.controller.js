import { sendSuccess } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";
import Project from "../models/Project.js";
import { getProjectProfitability } from '../services/profitability.service.js';

export const create = async (req, res) => {
  const doc = await Project.create({ ...req.body, workspace: req.workspaceId });
  sendSuccess(res, doc, "Project created", 201);
};

export const list = async (req, res) => {
  const query = { workspace: req.workspaceId };
  if (req.query.status) query.status = req.query.status;
  const docs = await Project.find(query).sort({ createdAt: -1 }).limit(100).populate("client", "name industry status");
  sendSuccess(res, docs, "Project list");
};

export const getById = async (req, res, next) => {
  const doc = await Project.findOne({ _id: req.params.id, workspace: req.workspaceId }).populate("client", "name industry status");
  if (!doc) return next(new AppError("Project not found", 404));
  sendSuccess(res, doc, "Project loaded");
};

export const update = async (req, res, next) => {
  const doc = await Project.findOneAndUpdate({ _id: req.params.id, workspace: req.workspaceId }, req.body, { new: true });
  if (!doc) return next(new AppError("Project not found", 404));
  sendSuccess(res, doc, "Project updated");
};

export const remove = async (req, res, next) => {
  const doc = await Project.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
  if (!doc) return next(new AppError("Project not found", 404));
  sendSuccess(res, null, "Project deleted");
};
export const profitability = async (req, res) => sendSuccess(res, await getProjectProfitability(req.workspaceId, req.params.id), 'Project profitability');
