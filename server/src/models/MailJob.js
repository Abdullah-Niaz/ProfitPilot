import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  to:{type:String,required:true}, subject:String, text:String,
  status:{type:String,enum:['pending','sending','sent','failed'],default:'pending'},
  attempts:{type:Number,default:0}, nextAttemptAt:{type:Date,default:Date.now},
  leaseUntil:Date, providerId:String, lastError:String,
  expiresAt:{type:Date,required:true}
},{timestamps:true});
schema.index({status:1,nextAttemptAt:1});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('MailJob',schema);
