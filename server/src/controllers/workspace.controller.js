import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getCurrentWorkspace = async (req, res, next) => {
  const workspace = await Workspace.findById(req.workspaceId);
  const members = await WorkspaceMember.find({ workspace: req.workspaceId }).populate("user", "name email avatar");
  sendSuccess(res, { workspace, members }, "Workspace loaded");
};

export const updateWorkspace = async (req, res, next) => {
  const workspace = await Workspace.findByIdAndUpdate(req.workspaceId, req.body, { new: true });
  sendSuccess(res, workspace, "Workspace updated");
};
