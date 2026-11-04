import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import { AppError } from '../utils/AppError.js';

export async function validateRelations(workspace, data) {
  if (data.client && !await Client.exists({_id: data.client, workspace})) {
    throw new AppError('Client not found in this workspace', 404);
  }
  if (data.project && !await Project.exists({_id: data.project, workspace, client: data.client})) {
    throw new AppError('Project does not belong to this client and workspace', 400);
  }
  if (data.assignedMembers?.length) {
    const count = await WorkspaceMember.countDocuments({workspace, user: {$in: data.assignedMembers}, status: 'active'});
    if (count !== data.assignedMembers.length) throw new AppError('Assigned members must be active workspace members', 400);
  }
}

export async function getAndValidateWorkspaceCurrency(workspaceId, requestedCurrency) {
  const workspace = await Workspace.findById(workspaceId).select('currency');
  if (!workspace) throw new AppError('Workspace not found', 404);
  const targetCurrency = workspace.currency || 'USD';
  if (requestedCurrency && requestedCurrency !== targetCurrency) {
    throw new AppError(`Currency '${requestedCurrency}' does not match workspace currency '${targetCurrency}'`, 400);
  }
  return targetCurrency;
}
