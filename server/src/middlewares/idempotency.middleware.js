import crypto from 'node:crypto';
import { AppError } from '../utils/AppError.js';

// Reservation and response persistence happen inside financialAction's transaction.
export function idempotency() {
  return (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!key) return next();
    if (typeof key !== 'string' || !key.trim() || key.length > 128) {
      return next(new AppError('Invalid Idempotency-Key header (must be 1-128 chars)', 400));
    }
    req.idempotency = {
      key: key.trim(),
      requestHash: crypto.createHash('sha256').update(JSON.stringify({
        actor: String(req.user._id), method: req.method,
        path: req.baseUrl + req.path, body: req.body
      })).digest('hex')
    };
    next();
  };
}
