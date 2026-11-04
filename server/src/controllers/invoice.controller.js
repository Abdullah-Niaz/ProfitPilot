import { invoiceAmounts } from '../services/invoiceAmounts.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { invoiceSchema, invoiceUpdateSchema, reversalSchema, objectId, listSchema } from '../validation/schemas.js';
import { validateRelations, getAndValidateWorkspaceCurrency } from '../services/relations.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';

export async function create(req, res) {
  const data = invoiceSchema.parse(req.body);
  await validateRelations(req.workspaceId, data);
  data.currency = await getAndValidateWorkspaceCurrency(req.workspaceId, data.currency);

  const amounts = invoiceAmounts(data);
  const totalCents = amounts.totalAmountInCents;

  if (!data.invoiceNo) {
    data.invoiceNo = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  } else {
    const exists = await Invoice.exists({ workspace: req.workspaceId, invoiceNo: data.invoiceNo });
    if (exists) throw new AppError('Invoice number already exists in this workspace', 409);
  }

  const invoice = await Invoice.create({
    ...data,
    ...amounts,
    workspace: req.workspaceId,
    totalAmountInCents: totalCents,
    amount: totalCents / 100,
    amountPaidInCents: 0,
    amountPaid: 0,
    balanceDueInCents: totalCents,
    balanceDue: totalCents / 100,
    status: 'Draft'
  });

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'CREATE_INVOICE',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: {
      invoiceNo: invoice.invoiceNo,
      totalAmountInCents: invoice.totalAmountInCents,
      currency: invoice.currency
    }
  });

  sendSuccess(res, invoice, 'Invoice created', 201);
}

export async function list(req, res) {
  const { status, page, limit, client, project } = listSchema.parse(req.query);
  const filter = { workspace: req.workspaceId };
  if (client) filter.client = client;
  if (project) filter.project = project;
  if (status) {
    if (!Invoice.schema.path('status').enumValues.includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }
    filter.status = status;
  }

  const query = Invoice.find(filter)
    .populate({ path: 'client', select: 'name industry status', match: { workspace: req.workspaceId } })
    .populate({ path: 'project', select: 'name status budget', match: { workspace: req.workspaceId } })
    .sort({ issueDate: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  sendSuccess(res, await query, 'Invoice list');
}

export async function getById(req, res) {
  const id = objectId.parse(req.params.id);
  const invoice = await Invoice.findOne({ _id: id, workspace: req.workspaceId })
    .populate({ path: 'client', select: 'name industry status', match: { workspace: req.workspaceId } })
    .populate({ path: 'project', select: 'name status budget', match: { workspace: req.workspaceId } });

  if (!invoice) throw new AppError('Invoice not found', 404);

  const payments = await Payment.find({ workspace: req.workspaceId, invoice: id, status: { $ne: 'Reversed' } })
    .sort({ paidAt: -1 });

  sendSuccess(res, { invoice, payments }, 'Invoice loaded');
}

export async function update(req, res) {
  const id = objectId.parse(req.params.id);
  const current = await Invoice.findOne({ _id: id, workspace: req.workspaceId });
  if (!current) throw new AppError('Invoice not found', 404);

  if (current.status !== 'Draft') {
    throw new AppError(`Invoices in '${current.status}' status cannot be edited`, 409);
  }

  const changes = invoiceUpdateSchema.parse(req.body);
  await validateRelations(req.workspaceId, { ...current.toObject(), ...changes });

  if (changes.currency && changes.currency !== current.currency) {
    changes.currency = await getAndValidateWorkspaceCurrency(req.workspaceId, changes.currency);
  }

  if (changes.totalAmount !== undefined || changes.amount !== undefined || changes.lineItems !== undefined) {
    Object.assign(changes, invoiceAmounts(changes, current.toObject()));
  }
  delete changes.totalAmount;

  const updated = await Invoice.findOneAndUpdate(
    { _id: id, workspace: req.workspaceId, status: 'Draft', __v: current.__v },
    { $set: changes, $inc: { __v: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new AppError('Invoice was modified concurrently; please reload', 409);

  await logAuditEvent({ workspace: req.workspaceId, actor: req.user._id,
    action: 'UPDATE_INVOICE', entity: 'Invoice', entityId: updated._id,
    metadata: { before: current.toObject(), after: updated.toObject() } });
  sendSuccess(res, updated, 'Invoice updated');
}

export async function sendInvoice(req, res) {
  const id = objectId.parse(req.params.id);
  const invoice = await Invoice.findOne({ _id: id, workspace: req.workspaceId });
  if (!invoice) throw new AppError('Invoice not found', 404);

  if (invoice.status !== 'Draft') {
    throw new AppError(`Only draft invoices can be sent; current status is '${invoice.status}'`, 409);
  }

  invoice.__v += 1;
  invoice.status = 'Sent';
  invoice.issueDate = invoice.issueDate || new Date();
  await invoice.save();

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'SEND_INVOICE',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: { invoiceNo: invoice.invoiceNo, totalAmountInCents: invoice.totalAmountInCents }
  });

  sendSuccess(res, invoice, 'Invoice sent');
}

export async function voidInvoice(req, res) {
  const id = objectId.parse(req.params.id);
  const invoice = await Invoice.findOne({ _id: id, workspace: req.workspaceId });
  if (!invoice) throw new AppError('Invoice not found', 404);

  if (invoice.status === 'Void') throw new AppError('Invoice is already voided', 409);
  if (invoice.amountPaidInCents > 0) {
    throw new AppError('Cannot void an invoice with recorded payments; reverse payments first', 409);
  }

  invoice.__v += 1;
  invoice.status = 'Void';
  invoice.voidedAt = new Date();
  invoice.voidedBy = req.user._id;
  invoice.voidReason = reversalSchema.parse(req.body).reason;
  await invoice.save();

  await logAuditEvent({
    workspace: req.workspaceId,
    actor: req.user._id,
    action: 'VOID_INVOICE',
    entity: 'Invoice',
    entityId: invoice._id,
    metadata: { invoiceNo: invoice.invoiceNo, reason: invoice.voidReason }
  });

  sendSuccess(res, invoice, 'Invoice voided');
}

export async function remove(req, res) {
  const id = objectId.parse(req.params.id);
  const invoice = await Invoice.findOne({ _id: id, workspace: req.workspaceId });
  if (!invoice) throw new AppError('Invoice not found', 404);

  if (invoice.status !== 'Draft') {
    throw new AppError(`Cannot delete invoice in '${invoice.status}' status; only draft invoices can be deleted`, 409);
  }

  await Invoice.deleteOne({ _id: id, workspace: req.workspaceId, status: 'Draft' });
  await logAuditEvent({ workspace: req.workspaceId, actor: req.user._id,
    action: 'DELETE_DRAFT_INVOICE', entity: 'Invoice', entityId: id,
    metadata: { invoiceNo: invoice.invoiceNo, totalAmountInCents: invoice.totalAmountInCents } });
  sendSuccess(res, null, 'Draft invoice deleted');
}

