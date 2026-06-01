import { verifyAccessToken } from "../utils/tokens.js";
import { AppError } from "../utils/AppError.js";
import User from "../models/User.js";
import WorkspaceMember from "../models/WorkspaceMember.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new AppError("Unauthorized", 401));

  const token = header.split(" ")[1];
  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.userId).select("-password -refreshToken");
  if (!user) return next(new AppError("User not found", 401));

  req.user = user;
  req.workspaceId = req.headers["x-workspace-id"] || decoded.workspaceId;
  next();
};

export const requireWorkspaceRole = (...roles) => async (req, res, next) => {
  const membership = await WorkspaceMember.findOne({ workspace: req.workspaceId, user: req.user._id, status: "active" });
  if (!membership) return next(new AppError("Workspace access denied", 403));
  req.memberRole = membership.role;
  if (roles.length && !roles.includes(membership.role)) return next(new AppError("Insufficient permissions", 403));
  next();
};
