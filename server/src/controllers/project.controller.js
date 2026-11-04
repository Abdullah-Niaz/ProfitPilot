import Model from '../models/Project.js';
import { projectSchema } from '../validation/schemas.js';
import { resourceController } from './resource.controller.js';
export const {create, list, getById, update, remove} = resourceController(Model, projectSchema, 'Project', {hasClient:true});
import { getProjectProfitability } from '../services/profitability.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { objectId } from '../validation/schemas.js';
export const profitability = async (req,res) => {
  const id=objectId.parse(req.params.id);
  if(!await Model.exists({_id:id,workspace:req.workspaceId})) throw new AppError('Project not found',404);
  sendSuccess(res,await getProjectProfitability(req.workspaceId,id),'Project profitability');
};
