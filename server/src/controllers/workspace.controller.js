import mongoose from 'mongoose';
import {issueAction} from '../services/mail.service.js';
import crypto from 'crypto';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import Revenue from '../models/Revenue.js';
import Expense from '../models/Expense.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { workspaceSchema, inviteMemberSchema, objectId } from '../validation/schemas.js';

export async function getCurrentWorkspace(req, res) {
  const workspace = await Workspace.findById(req.workspaceId);
  if (!workspace) throw new AppError('Workspace not found', 404);
  const members = await WorkspaceMember.find({ workspace: req.workspaceId }).populate('user', 'name email avatar');
  sendSuccess(res, { workspace, members }, 'Workspace loaded');
}

export async function updateWorkspace(req, res) {
  const changes = workspaceSchema.parse(req.body);
  const current = await Workspace.findById(req.workspaceId);
  if (!current) throw new AppError('Workspace not found', 404);
  if (changes.currency && changes.currency !== current.currency) {
    const used = await Promise.all([Revenue, Expense, Project, Invoice, Payment].map(model => model.exists({ workspace: req.workspaceId })));
    if (used.some(Boolean)) throw new AppError('Currency cannot change after financial data or budgets exist', 409);
  }
  const workspace = await Workspace.findOneAndUpdate({ _id: req.workspaceId, __v: current.__v }, { $set: changes, $inc: { __v: 1 } }, { new: true, runValidators: true });
  if (!workspace) throw new AppError('Workspace changed; reload and try again', 409);
  sendSuccess(res, workspace, 'Workspace updated');
}

export async function inviteMember(req, res) {
  const { email, role } = inviteMemberSchema.parse(req.body);
  const result=await mongoose.connection.transaction(async()=>{
    let user=await User.findOne({email});
    if(!user)user=await User.create({name:email.split('@')[0],email,password:crypto.randomBytes(32).toString('hex'),invitationOnly:true,isEmailVerified:false});
    let member=await WorkspaceMember.findOne({workspace:req.workspaceId,user:user._id});
    const created=!member;
    if(member?.status==='active')throw new AppError('User is already an active member of this workspace',409);
    if(!member)member=new WorkspaceMember({workspace:req.workspaceId,user:user._id});
    member.status='invited';member.role=role;await member.save();
    const link=await issueAction(user,'invite',member);
    return {member,link,created};
  });
  sendSuccess(res,{...result.member.toObject(),...(process.env.NODE_ENV==='development'?{developmentLink:result.link}:{})},'Invitation email queued',result.created?201:200);
}

export async function listMembers(req, res) {
  const members = await WorkspaceMember.find({ workspace: req.workspaceId })
    .populate('user', 'name email avatar isEmailVerified')
    .sort({ createdAt: 1 });
  sendSuccess(res, members, 'Workspace members list');
}

export async function removeMember(req, res) {
  const memberId = objectId.parse(req.params.id);
  const member = await WorkspaceMember.findOne({ _id: memberId, workspace: req.workspaceId });
  if (!member) throw new AppError('Member not found in this workspace', 404);
  if (member.role === 'Owner') throw new AppError('Workspace owner cannot be removed', 400);

  member.status = 'removed';
  await member.save();
  sendSuccess(res, null, 'Member removed');
}
