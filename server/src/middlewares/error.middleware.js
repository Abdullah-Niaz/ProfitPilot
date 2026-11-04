export const notFound = (req, res) => res.status(404).json({success:false, message:'Route not found'});
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.statusCode || err.status || 500;
  let message = err.message;
  if (err.name === 'ZodError') {status=400; message='Validation failed';}
  if (['ValidationError','CastError'].includes(err.name)) {status=400; message='Invalid request data';}
  if (['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(err.name)) {status=401; message='Invalid or expired session';}
  if (err.code === 11000) {status=409; message='Record already exists';}
  if (err.type === 'entity.parse.failed') {status=400; message='Invalid JSON';}
  if (status < 400 || status > 599) status=500;
  if (status >= 500) {
    console.error(JSON.stringify({event:'request_error',requestId:req.requestId,name:err.name,code:err.code}));
    message='Unable to complete request';
  }
  res.status(status).json({success:false, message, ...(err.name === 'ZodError' ? {errors:err.flatten()} : {})});
};
