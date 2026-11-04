import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { objectId, listSchema } from '../validation/schemas.js';
import { validateRelations, getAndValidateWorkspaceCurrency } from '../services/relations.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import Project from '../models/Project.js';
import Revenue from '../models/Revenue.js';
import Expense from '../models/Expense.js';
import Invoice from '../models/Invoice.js';

export function resourceController(Model, schema, label, {hasClient = true} = {}) {
  const scope = req => ({_id: objectId.parse(req.params.id), workspace: req.workspaceId});
  const populate = (query, workspace) => hasClient ? query.populate({path:'client', select:'name industry status', match:{workspace}}) : query;
  return {
    create: async (req, res) => {
      const data = schema.parse(req.body);
      await validateRelations(req.workspaceId, data);
      if (['Revenue', 'Expense', 'Project'].includes(label)) {
        data.currency = await getAndValidateWorkspaceCurrency(req.workspaceId, data.currency);
      }
      const record = await Model.create({...data, workspace:req.workspaceId});
      if (['Revenue', 'Expense'].includes(label)) {
        await logAuditEvent({
          workspace: req.workspaceId,
          actor: req.user._id,
          action: `POST_${label.toUpperCase()}`,
          entity: label,
          entityId: record._id,
          metadata: { amountInCents: record.amountInCents, amount: record.amount, currency: record.currency }
        });
      }
      sendSuccess(res, record, `${label} created`, 201);
    },
    list: async (req, res) => {
      const {status, page, limit, client, project} = listSchema.parse(req.query);
      const filter = {workspace:req.workspaceId};
      if (client) filter.client = client;
      if (project) filter.project = project;
      if (status) {
        const statusField = Model.schema.path('status') ? 'status' : Model.schema.path('paymentStatus') ? 'paymentStatus' : null;
        if (!statusField || !Model.schema.path(statusField).enumValues.includes(status)) throw new AppError('Invalid status filter', 400);
        filter[statusField] = status;
      }
      const query = Model.find(filter).sort({createdAt:-1, _id:-1}).skip((page-1)*limit).limit(limit);
      sendSuccess(res, await populate(query, req.workspaceId), `${label} list`);
    },
    getById: async (req, res) => {
      const doc = await populate(Model.findOne(scope(req)), req.workspaceId);
      if (!doc) throw new AppError(`${label} not found`, 404);
      sendSuccess(res, doc, `${label} loaded`);
    },
    update: async (req, res) => {
      const changes = schema.partial().strict().refine(value => Object.keys(value).length > 0, 'No changes supplied').parse(req.body);
      const filter = scope(req);
      const current = await Model.findOne(filter).lean();
      if (!current) throw new AppError(`${label} not found`, 404);
      await validateRelations(req.workspaceId, {...current, ...changes});

      // Guard posted financial records against direct mutation
      if (['Revenue', 'Expense'].includes(label)) {
        throw new AppError('Posted financial records cannot be edited; reverse and repost the corrected entry', 409);
      }

      // A project with financial entries cannot be reassigned to a different client.
      if (label === 'Project' && changes.client && changes.client !== String(current.client)) {
        if (await Revenue.exists({workspace:req.workspaceId, project:current._id}) || await Expense.exists({workspace:req.workspaceId, project:current._id})) {
          throw new AppError('A project with financial entries cannot change clients', 409);
        }
      }
      const doc = await Model.findOneAndUpdate({...filter, __v:current.__v}, {$set:changes, $inc:{__v:1}}, {new:true, runValidators:true});
      if (!doc) throw new AppError('Record changed; reload and try again', 409);
      sendSuccess(res, doc, `${label} updated`);
    },
    remove: async (req, res) => {
      const filter = scope(req);
      if (!await Model.exists(filter)) throw new AppError(`${label} not found`, 404);
      if (label === 'Client' || label === 'Project') {
        const relation = {workspace:req.workspaceId, [label.toLowerCase()]:filter._id};
        const models = label === 'Client' ? [Project, Revenue, Expense, Invoice] : [Revenue, Expense];
        if ((await Promise.all(models.map(model => model.exists(relation)))).some(Boolean)) throw new AppError('Record has linked data and cannot be deleted', 409);
      }
      // Posted financial deletion requires the audited reversal workflow in Phase 2.
      if (label === 'Revenue' || label === 'Expense') throw new AppError('Financial records cannot be deleted; corrections require a reversal workflow', 409);
      await Model.deleteOne(filter);
      sendSuccess(res, null, `${label} deleted`);
    },
  };
}
