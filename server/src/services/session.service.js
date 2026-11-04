import { createHash, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import AuthSession from '../models/AuthSession.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';

export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const cookieName = 'crmRefresh';
export const cookieOptions = () => ({httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'lax', path:'/api/auth'});
export function tokenPair(userId, workspaceId, sessionId) {
  const payload = {userId:String(userId), workspaceId:String(workspaceId), sid:String(sessionId)};
  const refreshToken = signRefreshToken({...payload, jti:randomUUID()});
  const expiresAt = new Date(verifyRefreshToken(refreshToken).exp * 1000);
  return {accessToken:signAccessToken(payload), refreshToken, expiresAt};
}
export function setRefreshCookie(res, pair) {
  res.cookie(cookieName, pair.refreshToken, {...cookieOptions(), expires:pair.expiresAt});
}
export async function createSession(userId, workspaceId, res) {
  const id = new mongoose.Types.ObjectId();
  const pair = tokenPair(userId, workspaceId, id);
  await AuthSession.create({_id:id, user:userId, workspace:workspaceId, refreshHash:hashToken(pair.refreshToken), expiresAt:pair.expiresAt});
  setRefreshCookie(res, pair);
  return pair.accessToken;
}
