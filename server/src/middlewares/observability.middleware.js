import crypto from 'node:crypto';
export function observeRequest(req,res,next){
  req.requestId=crypto.randomUUID();res.setHeader('X-Request-Id',req.requestId);
  const start=performance.now();
  res.once('finish',()=>{
    if(process.env.NODE_ENV!=='test')console.log(JSON.stringify({event:'http',requestId:req.requestId,
      method:req.method,path:req.originalUrl.split('?')[0],status:res.statusCode,ms:Math.round(performance.now()-start)}));
  });
  next();
}
