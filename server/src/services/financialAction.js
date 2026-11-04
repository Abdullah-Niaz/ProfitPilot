import mongoose from 'mongoose';
import IdempotencyKey from '../models/IdempotencyKey.js';
import { AppError } from '../utils/AppError.js';

// Propagate the session to all model operations, including relation and audit
// writes. Financial handlers must not start nested transactions or send emails.
mongoose.set('transactionAsyncLocalStorage', true);

function replay(record, requestHash) {
  if (record.requestHash !== requestHash) throw new AppError('Idempotency key reused with different request payload', 422);
  if (record.status !== 'completed') throw new AppError('Request is still processing', 409);
  return { status: record.statusCode, body: record.responseBody, replay: true };
}

export function financialAction(handler) {
  return async (req, res) => {
    const key = req.idempotency;
    const filter = key && { workspace: req.workspaceId, key: key.key };
    let result;
    try {
      result = await mongoose.connection.transaction(async () => {
        let reservation;
        if (key) {
          const existing = await IdempotencyKey.findOne(filter);
          if (existing) return replay(existing, key.requestHash);
          reservation = await IdempotencyKey.create({ ...filter, requestHash: key.requestHash,
            expiresAt: new Date(Date.now() + 86400000), status: 'processing' });
        }
        let status = 200;
        let body;
        // Buffer the response until the commit succeeds.
        const response = {
          status(code) { status = code; return this; },
          json(value) { body = JSON.parse(JSON.stringify(value)); return this; }
        };
        await handler(req, response);
        if (!body || status >= 400) throw new Error('Financial handler did not produce a successful response');
        if (reservation) {
          await IdempotencyKey.updateOne({ _id: reservation._id }, {
            $set: { status: 'completed', statusCode: status, responseBody: body }
          });
        }
        return { status, body };
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' });
    } catch (error) {
      // Simultaneous reservations may race on the unique index. Only replay
      // a committed response; never repeat a possibly committed write.
      if (key && error.code === 11000) {
        const existing = await IdempotencyKey.findOne(filter);
        if (!existing) throw error;
        result = replay(existing, key.requestHash);
      } else {
        throw error;
      }
    }
    if (result.replay) res.setHeader('X-Idempotent-Replay', 'true');
    res.status(result.status).json(result.body);
  };
}
