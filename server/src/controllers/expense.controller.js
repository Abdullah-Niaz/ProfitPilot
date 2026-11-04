import Model from '../models/Expense.js';
import { expenseSchema, reversalSchema, objectId } from '../validation/schemas.js';
import { resourceController } from './resource.controller.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { logAuditEvent } from '../services/audit.service.js';

const baseController = resourceController(Model, expenseSchema, 'Expense', {hasClient:true});

export const { create, list, getById, update, remove } = baseController;

export async function reverse(req, res) {
  const { reason } = reversalSchema.parse(req.body);
  const id = objectId.parse(req.params.id);
  const expense = await Model.findOne({ _id: id, workspace: req.workspaceId });
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.status === 'Reversed') throw new AppError('Expense is already reversed', 409);

  expense.status = 'Reversed';
  expense.reversedAt = new Date();
  expense.reversedBy = req.user._id;
  expense.reversalReason = reason;
  await expense.save();

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'REVERSE_EXPENSE',
    entity: 'Expense',
    entityId: expense._id,
    metadata: {
      amountInCents: expense.amountInCents,
      amount: expense.amount,
      currency: expense.currency,
      reason
    }
  });

  sendSuccess(res, expense, 'Expense reversed');
}
