import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import AuthSession from '../models/AuthSession.js';
import { objectId } from '../validation/schemas.js';

export async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('Unauthorized', 401);
  const decoded = verifyAccessToken(header.slice(7));
  if (![decoded.userId, decoded.sid, decoded.workspaceId].every(value => objectId.safeParse(value).success)) throw new AppError('Sign in again', 401);
  const session = await AuthSession.findOne({_id:decoded.sid, user:decoded.userId, workspace:decoded.workspaceId, revokedAt:null, expiresAt:{$gt:new Date()}});
  if (!session) throw new AppError('Session expired or revoked', 401);
  const user = await User.findById(decoded.userId).select('name email isEmailVerified');
  if (!user) throw new AppError('Unauthorized', 401);
  const workspaceId = objectId.parse(req.headers['x-workspace-id'] || decoded.workspaceId);
  const member = await WorkspaceMember.findOne({workspace:workspaceId, user:user._id, status:'active'});
  if (!member) throw new AppError('Workspace access denied', 403);
  req.user = user;
  req.workspaceId = workspaceId;
  req.memberRole = member.role;
  req.sessionId = session._id;
  next();
}
export const requireWorkspaceRole = (...roles) => (req, res, next) => {
  if (!req.memberRole || (roles.length && !roles.includes(req.memberRole))) throw new AppError('Insufficient permissions', 403);
  next();
};
