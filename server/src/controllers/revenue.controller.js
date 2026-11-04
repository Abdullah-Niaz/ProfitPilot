import Model from '../models/Revenue.js';
import { revenueSchema, reversalSchema, objectId } from '../validation/schemas.js';
import { resourceController } from './resource.controller.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { logAuditEvent } from '../services/audit.service.js';

const baseController = resourceController(Model, revenueSchema, 'Revenue', {hasClient:true});

export const { create, list, getById, update, remove } = baseController;

export async function reverse(req, res) {
  const { reason } = reversalSchema.parse(req.body);
  const id = objectId.parse(req.params.id);
  const revenue = await Model.findOne({ _id: id, workspace: req.workspaceId });
  if (!revenue) throw new AppError('Revenue not found', 404);
  if (revenue.status === 'Reversed') throw new AppError('Revenue is already reversed', 409);
  if (revenue.payment) throw new AppError('This revenue is linked to a payment; reverse the payment instead', 409);

  revenue.status = 'Reversed';
  revenue.reversedAt = new Date();
  revenue.reversedBy = req.user._id;
  revenue.reversalReason = reason;
  await revenue.save();

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'REVERSE_REVENUE',
    entity: 'Revenue',
    entityId: revenue._id,
    metadata: {
      amountInCents: revenue.amountInCents,
      amount: revenue.amount,
      currency: revenue.currency,
      reason
    }
  });

  sendSuccess(res, revenue, 'Revenue reversed');
}
