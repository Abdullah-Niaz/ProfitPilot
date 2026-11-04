import AuditLog from '../models/AuditLog.js';

export async function logAuditEvent({ workspace, actor, action, entity, entityId, metadata = {} }) {
  if (!actor) throw new Error('An authenticated actor is required for financial audit events');
  return AuditLog.create({ workspace, actor, action, entity,
    entityId: entityId ? String(entityId) : 'N/A', metadata });
}
