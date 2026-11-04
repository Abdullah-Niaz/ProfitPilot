import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: {type:mongoose.Schema.Types.ObjectId, ref:'User', required:true, index:true},
  workspace: {type:mongoose.Schema.Types.ObjectId, ref:'Workspace', required:true},
  refreshHash: {type:String, required:true, select:false},
  expiresAt: {type:Date, required:true},
  revokedAt: {type:Date, default:null},
}, {timestamps:true});
schema.index({expiresAt:1}, {expireAfterSeconds:0});
export default mongoose.model('AuthSession', schema);
