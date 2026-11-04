import { AppError } from '../utils/AppError.js';

// Browser cookie-authenticated mutations must originate from the configured UI.
export function trustedOrigin(req, res, next) {
  const origin = req.get('origin');
  const expected = process.env.CLIENT_URL || 'http://localhost:5173';
  if ((origin && origin !== expected) || req.get('sec-fetch-site') === 'cross-site') return next(new AppError('Origin not allowed', 403));
  next();
}
