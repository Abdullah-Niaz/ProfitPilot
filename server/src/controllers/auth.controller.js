import mongoose from 'mongoose';
import {queueMail,actionLink} from '../services/mail.service.js';
import crypto from 'crypto';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import AuthSession from '../models/AuthSession.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { verifyRefreshToken } from '../utils/tokens.js';
import { registrationSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, objectId } from '../validation/schemas.js';
import { createSession, tokenPair, hashToken, cookieName, cookieOptions, setRefreshCookie } from '../services/session.service.js';

const profile = user => ({id:user._id, name:user.name, email:user.email, isEmailVerified:user.isEmailVerified});

export async function register(req, res) {
  const {name, email, password, workspaceName} = registrationSchema.parse(req.body);
  if (await User.exists({email})) throw new AppError('Email already registered', 409);
  let user, workspace;
  try {
    user = await User.create({name, email, password, isEmailVerified:false});
    workspace = await Workspace.create({name:workspaceName || `${name}'s Agency`, owner:user._id});
    await WorkspaceMember.create({workspace:workspace._id, user:user._id, role:'Owner', status:'active'});
    const accessToken = await createSession(user._id, workspace._id, res);
    sendSuccess(res, {user:profile(user), workspace, workspaceId:workspace._id, role:'Owner', accessToken}, 'Registered', 201);
  } catch (error) {
    if (user) {
      await AuthSession.deleteMany({user:user._id});
      await WorkspaceMember.deleteMany({user:user._id});
      if (workspace) await Workspace.deleteOne({_id:workspace._id, owner:user._id});
      await User.deleteOne({_id:user._id});
    }
    throw error;
  }
}

export async function login(req, res) {
  const {email, password} = loginSchema.parse(req.body);
  const user = await User.findOne({email});
  if (!user || !await user.comparePassword(password)) throw new AppError('Invalid credentials', 401);
  const member = await WorkspaceMember.findOne({user:user._id, status:'active'});
  if (!member) throw new AppError('No active workspace membership', 403);
  const accessToken = await createSession(user._id, member.workspace, res);
  await User.updateOne({_id:user._id}, {$set:{lastLogin:new Date()}, $unset:{refreshToken:1}});
  sendSuccess(res, {user:profile(user), workspaceId:member.workspace, role:member.role, accessToken}, 'Logged in');
}

export async function refreshToken(req, res) {
  const token = req.cookies?.[cookieName];
  if (!token) throw new AppError('Refresh session required', 401);
  const decoded = verifyRefreshToken(token);
  objectId.parse(decoded.sid); objectId.parse(decoded.userId); objectId.parse(decoded.workspaceId);
  if (!await User.exists({_id:decoded.userId}) || !await WorkspaceMember.exists({workspace:decoded.workspaceId, user:decoded.userId, status:'active'})) {
    await AuthSession.updateOne({_id:decoded.sid, user:decoded.userId}, {$set:{revokedAt:new Date()}});
    throw new AppError('Session no longer authorized', 401);
  }
  const pair = tokenPair(decoded.userId, decoded.workspaceId, decoded.sid);
  const session = await AuthSession.findOneAndUpdate({
    _id:decoded.sid, user:decoded.userId, workspace:decoded.workspaceId,
    refreshHash:hashToken(token), revokedAt:null, expiresAt:{$gt:new Date()},
  }, {$set:{refreshHash:hashToken(pair.refreshToken), expiresAt:pair.expiresAt}}, {new:true});
  if (!session) throw new AppError('Refresh token expired or already used', 401);
  setRefreshCookie(res, pair);
  sendSuccess(res, {accessToken:pair.accessToken}, 'Token refreshed');
}

export const me = async (req, res) => sendSuccess(res, {user:profile(req.user), workspaceId:req.workspaceId, role:req.memberRole}, 'Profile loaded');

export async function logout(req, res) {
  const token = req.cookies?.[cookieName];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token, {ignoreExpiration:true});
      if (objectId.safeParse(decoded.sid).success) await AuthSession.updateOne({_id:decoded.sid, user:decoded.userId}, {$set:{revokedAt:new Date()}});
    } catch (error) {
      if (!['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(error.name)) throw error;
    }
  }
  res.clearCookie(cookieName, cookieOptions());
  sendSuccess(res, null, 'Logged out');
}

export async function forgotPassword(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (!user) {
    return sendSuccess(res, { message: 'If this email is registered, recovery instructions will be sent' }, 'Recovery initiated');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await mongoose.connection.transaction(async()=>{
    await user.save();
    await queueMail(email,'Reset your password',actionLink('/reset-password',{email,token:resetToken}));
  });

  const isDev = process.env.NODE_ENV !== 'production';
  sendSuccess(res, {
    message: 'If this email is registered, recovery instructions will be sent',
    ...(isDev ? { resetToken } : {})
  }, 'Recovery initiated');
}

export async function resetPassword(req, res) {
  const { email, token, newPassword } = resetPasswordSchema.parse(req.body);
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  await mongoose.connection.transaction(async()=>{
  const user = await User.findOne({
    email,
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new AppError('Password reset token is invalid or has expired', 400);
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await AuthSession.updateMany({ user: user._id }, { $set: { revokedAt: new Date() } });

  });
  sendSuccess(res, null, 'Password reset successful. Please sign in with your new password.');
}
