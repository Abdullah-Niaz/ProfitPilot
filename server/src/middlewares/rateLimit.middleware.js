import crypto from 'node:crypto';
import RateBucket from '../models/RateBucket.js';
export function sharedRateLimit({namespace,windowMs,max}){
  return async(req,res,next)=>{
    if(req.path==='/api/health')return next();
    try{
      const bucket=Math.floor(Date.now()/windowMs);
      const id=namespace+':'+crypto.createHash('sha256').update(req.ip||'unknown').digest('hex')+':'+bucket;
      const expiresAt=new Date((bucket+1)*windowMs);
      let record;
      try{record=await RateBucket.findOneAndUpdate({_id:id},{$inc:{hits:1},$setOnInsert:{expiresAt}},{upsert:true,new:true});}
      catch(error){if(error.code!==11000)throw error;record=await RateBucket.findOneAndUpdate({_id:id},{$inc:{hits:1}},{new:true});}
      res.setHeader('RateLimit-Limit',max);
      res.setHeader('RateLimit-Remaining',Math.max(0,max-record.hits));
      if(record.hits>max){res.setHeader('Retry-After',Math.max(1,Math.ceil((expiresAt-Date.now())/1000)));return res.status(429).json({success:false,message:'Too many requests. Please try again later.'});}
      next();
    }catch(error){next(error);}
  };
}
