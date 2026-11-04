import jwt from 'jsonwebtoken';
const options = {algorithm:'HS256', issuer:'financial-crm', audience:'financial-crm-api'};
const verifyOptions = {algorithms:['HS256'], issuer:options.issuer, audience:options.audience};
function secret(name) {
  const value=process.env[name];
  if(!value || value.length<32) throw new Error(`${name} must contain at least 32 characters`);
  return value;
}
export const signAccessToken = payload => jwt.sign(payload,secret('JWT_ACCESS_SECRET'),{...options,expiresIn:process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'});
export const signRefreshToken = payload => jwt.sign(payload,secret('JWT_REFRESH_SECRET'),{...options,expiresIn:process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'});
export const verifyAccessToken = token => jwt.verify(token,secret('JWT_ACCESS_SECRET'),verifyOptions);
export const verifyRefreshToken = (token,extra={}) => jwt.verify(token,secret('JWT_REFRESH_SECRET'),{...verifyOptions,...extra});
