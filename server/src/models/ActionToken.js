import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  hash: {type:String,required:true,unique:true},
  purpose: {type:String,enum:['invite','verify'],required:true},
  user: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  member: {type:mongoose.Schema.Types.ObjectId,ref:'WorkspaceMember'},
  expiresAt: {type:Date,required:true}, usedAt: Date
},{timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('ActionToken',schema);
