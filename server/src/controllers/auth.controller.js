import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";

const tokenPayload = (user, workspaceId) => ({ userId: user._id, workspaceId });

export const register = async (req, res, next) => {
  try {
    const { name, email, password, workspaceName } = req.body;
    const exists = await User.findOne({ email });
    if (exists) throw new AppError("Email already registered", 409);
    const user = await User.create({ name, email, password, isEmailVerified: true });
    const workspace = await Workspace.create({ name: workspaceName || `${name}'s Agency`, owner: user._id });
    await WorkspaceMember.create({ workspace: workspace._id, user: user._id, role: "Owner", status: "active" });
    const accessToken = signAccessToken(tokenPayload(user, workspace._id));
    const refreshToken = signRefreshToken(tokenPayload(user, workspace._id));
    user.refreshToken = refreshToken;
    await user.save();
    sendSuccess(res, { user: { id: user._id, name, email }, workspace, accessToken, refreshToken }, "Registered", 201);
  } catch (err) { next(err); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) throw new AppError("Invalid credentials", 401);
    const membership = await WorkspaceMember.findOne({ user: user._id, status: "active" });
    const accessToken = signAccessToken(tokenPayload(user, membership.workspace));
    const refreshToken = signRefreshToken(tokenPayload(user, membership.workspace));
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    sendSuccess(res, { user: { id: user._id, name: user.name, email: user.email }, workspaceId: membership.workspace, role: membership.role, accessToken, refreshToken }, "Logged in");
  } catch (err) { next(err); }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError("Refresh token required", 400);
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) throw new AppError("Invalid refresh token", 401);
    const accessToken = signAccessToken({ userId: user._id, workspaceId: decoded.workspaceId });
    sendSuccess(res, { accessToken }, "Token refreshed");
  } catch (err) { next(err); }
};

export const me = async (req, res) => sendSuccess(res, { user: req.user, workspaceId: req.workspaceId }, "Profile loaded");
export const logout = async (req, res) => sendSuccess(res, null, "Logged out");
