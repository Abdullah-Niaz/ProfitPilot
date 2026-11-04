import mongoose from 'mongoose';
import User from '../models/User.js';
import ActionToken from '../models/ActionToken.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import {digest,issueAction} from '../services/mail.service.js';
import {acceptInvitationSchema,actionTokenSchema} from '../validation/schemas.js';
import {AppError} from '../utils/AppError.js';
import {sendSuccess} from '../utils/apiResponse.js';
import {createSession} from '../services/session.service.js';
export async function requestVerification(req,res){
  if(req.user.isEmailVerified)return sendSuccess(res,null,'Email already verified');
  const link=await mongoose.connection.transaction(()=>issueAction(req.user,'verify'));
  sendSuccess(res,process.env.NODE_ENV==='development'?{developmentLink:link}:null,'Verification email queued');
}
export async function verifyEmail(req,res){
  const {token}=actionTokenSchema.parse(req.body);
  await mongoose.connection.transaction(async()=>{
    const action=await ActionToken.findOneAndUpdate({hash:digest(token),purpose:'verify',usedAt:null,expiresAt:{$gt:new Date()}},{$set:{usedAt:new Date()}},{new:true});
    if(!action)throw new AppError('Link is invalid or expired',400);
    await User.updateOne({_id:action.user},{$set:{isEmailVerified:true}});
  });
  sendSuccess(res,null,'Email verified. You can return to your workspace.');
}
export async function acceptInvitation(req,res){
  const data=acceptInvitationSchema.parse(req.body);
  const result=await mongoose.connection.transaction(async()=>{
    const action=await ActionToken.findOne({hash:digest(data.token),purpose:'invite',usedAt:null,expiresAt:{$gt:new Date()}});
    if(!action)throw new AppError('Invitation is invalid or expired',400);
    const member=await WorkspaceMember.findOne({_id:action.member,user:action.user,status:'invited'});
    const user=await User.findById(action.user);
    if(!member || !user)throw new AppError('Invitation is no longer available',400);
    if(user.invitationOnly){
      if(!data.newPassword)throw new AppError('Choose a password of at least 12 characters',400);
      user.password=data.newPassword; user.invitationOnly=false;
    } else if(!data.password || !await user.comparePassword(data.password)){
      throw new AppError('Enter your existing account password to join this workspace',401);
    }
    user.isEmailVerified=true; await user.save();
    member.status='active'; await member.save();
    action.usedAt=new Date(); await action.save();
    return {user,member};
  });
  const {user,member}=result;
  const accessToken=await createSession(user._id,member.workspace,res);
  sendSuccess(res,{user:{id:user._id,name:user.name,email:user.email,isEmailVerified:user.isEmailVerified},
    workspaceId:member.workspace,role:member.role,accessToken},'Invitation accepted');
}
