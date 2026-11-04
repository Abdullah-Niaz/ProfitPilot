import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Revenue from '../models/Revenue.js';
import { paymentSchema, reversalSchema, objectId, listSchema } from '../validation/schemas.js';
import { validateRelations, getAndValidateWorkspaceCurrency } from '../services/relations.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';

export async function create(req, res) {
  const data = paymentSchema.parse(req.body);
  const amountInCents = Math.round(data.amount * 100);

  let updatedInvoice = null;

  if (data.invoice) {
    const invoice = await Invoice.findOne({ _id: data.invoice, workspace: req.workspaceId });
    if (!invoice) throw new AppError('Invoice not found in this workspace', 404);

    if (['Draft', 'Void'].includes(invoice.status)) {
      throw new AppError(`Cannot apply payment to an invoice in '${invoice.status}' status`, 400);
    }

    if (data.client && String(data.client) !== String(invoice.client)) {
      throw new AppError('Payment client does not match invoice client', 400);
    }
    data.client = invoice.client;
    if (data.project && String(data.project) !== String(invoice.project || '')) {
      throw new AppError('Payment project does not match invoice project', 400);
    }
    data.project = invoice.project;
    await validateRelations(req.workspaceId, data);

    if (data.currency && data.currency !== invoice.currency) {
      throw new AppError(`Payment currency '${data.currency}' does not match invoice currency '${invoice.currency}'`, 400);
    }
    data.currency = invoice.currency;

    // Atomic update preventing overpayment and concurrent double-allocation
    updatedInvoice = await Invoice.findOneAndUpdate(
      {
        _id: invoice._id,
        workspace: req.workspaceId,
        status: { $in: ['Sent', 'Partially Paid', 'Overdue'] },
        balanceDueInCents: { $gte: amountInCents }
      },
      {
        $inc: { amountPaidInCents: amountInCents, balanceDueInCents: -amountInCents }
      },
      { new: true }
    );

    if (!updatedInvoice) {
      throw new AppError(
        `Payment of ${(amountInCents / 100).toFixed(2)} exceeds remaining invoice balance of ${(invoice.balanceDueInCents / 100).toFixed(2)}`,
        409
      );
    }

    const newStatus = updatedInvoice.balanceDueInCents === 0 ? 'Paid' : 'Partially Paid';
    await Invoice.updateOne(
      { _id: updatedInvoice._id },
      {
        $set: {
          status: newStatus,
          amountPaid: updatedInvoice.amountPaidInCents / 100,
          balanceDue: updatedInvoice.balanceDueInCents / 100
        }
      }
    );
    updatedInvoice.status = newStatus;
    updatedInvoice.amountPaid = updatedInvoice.amountPaidInCents / 100;
    updatedInvoice.balanceDue = updatedInvoice.balanceDueInCents / 100;
  } else {
    await validateRelations(req.workspaceId, data);
    data.currency = await getAndValidateWorkspaceCurrency(req.workspaceId, data.currency);
  }

  const payment = await Payment.create({
    ...data,
    workspace: req.workspaceId,
    amountInCents,
    amount: amountInCents / 100,
    status: 'Posted',
    paidAt: data.paidAt || new Date()
  });

  // Create corresponding posted Revenue entry for the payment
  const revenue = await Revenue.create({
    workspace: req.workspaceId,
    client: payment.client,
    project: payment.project,
    invoice: payment.invoice,
    payment: payment._id,
    amount: payment.amount,
    amountInCents: payment.amountInCents,
    currency: payment.currency,
    type: payment.invoice ? 'Milestone Payment' : 'One-Time Payment',
    paymentStatus: 'Paid',
    paymentMethod: payment.paymentMethod,
    date: payment.paidAt,
    effectiveDate: payment.paidAt,
    settledDate: payment.paidAt,
    status: 'Posted'
  });

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'POST_PAYMENT',
    entity: 'Payment',
    entityId: payment._id,
    metadata: {
      amountInCents: payment.amountInCents,
      amount: payment.amount,
      currency: payment.currency,
      invoice: payment.invoice,
      client: payment.client
    }
  });

  sendSuccess(res, { payment, revenue, invoice: updatedInvoice }, 'Payment recorded', 201);
}

export async function list(req, res) {
  const { page, limit, client, invoice } = listSchema.parse(req.query);
  const filter = { workspace: req.workspaceId };
  if (client) filter.client = client;
  if (invoice) filter.invoice = invoice;

  const query = Payment.find(filter)
    .populate({ path: 'client', select: 'name industry status', match: { workspace: req.workspaceId } })
    .populate({ path: 'invoice', select: 'invoiceNo totalAmountInCents status', match: { workspace: req.workspaceId } })
    .sort({ paidAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  sendSuccess(res, await query, 'Payment list');
}

export async function getById(req, res) {
  const id = objectId.parse(req.params.id);
  const payment = await Payment.findOne({ _id: id, workspace: req.workspaceId })
    .populate({ path: 'client', select: 'name industry status', match: { workspace: req.workspaceId } })
    .populate({ path: 'invoice', select: 'invoiceNo totalAmountInCents amountPaidInCents balanceDueInCents status', match: { workspace: req.workspaceId } });

  if (!payment) throw new AppError('Payment not found', 404);
  sendSuccess(res, payment, 'Payment loaded');
}

export async function reverse(req, res) {
  const { reason } = reversalSchema.parse(req.body);
  const id = objectId.parse(req.params.id);

  const payment = await Payment.findOne({ _id: id, workspace: req.workspaceId });
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status === 'Reversed') throw new AppError('Payment is already reversed', 409);

  payment.status = 'Reversed';
  payment.reversedAt = new Date();
  payment.reversedBy = req.user._id;
  payment.reversalReason = reason;
  await payment.save();

  if (payment.invoice) {
    const inv = await Invoice.findOneAndUpdate(
      { _id: payment.invoice, workspace: req.workspaceId, amountPaidInCents: { $gte: payment.amountInCents }, status: { $ne: 'Void' } },
      {
        $inc: { amountPaidInCents: -payment.amountInCents, balanceDueInCents: payment.amountInCents }
      },
      { new: true }
    );

    if (!inv) throw new AppError('Invoice balance cannot be reconciled; reversal cancelled', 409);
    if (inv) {
      const restoredStatus = inv.amountPaidInCents === 0 ? 'Sent' : 'Partially Paid';
      await Invoice.updateOne(
        { _id: inv._id },
        {
          $set: {
            status: restoredStatus,
            amountPaid: inv.amountPaidInCents / 100,
            balanceDue: inv.balanceDueInCents / 100
          }
        }
      );
    }
  }

  // Reverse any linked revenue records
  await Revenue.updateMany(
    { payment: payment._id, workspace: req.workspaceId },
    { $set: { status: 'Reversed', reversedAt: new Date(), reversedBy: req.user._id, reversalReason: reason } }
  );

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'REVERSE_PAYMENT',
    entity: 'Payment',
    entityId: payment._id,
    metadata: {
      amountInCents: payment.amountInCents,
      amount: payment.amount,
      currency: payment.currency,
      invoice: payment.invoice,
      reason
    }
  });

  sendSuccess(res, payment, 'Payment reversed');
}

export async function remove(req, res) {
  throw new AppError('Payment records cannot be deleted; use the audited reversal workflow', 409);
}

