import Model from '../models/Client.js';
import { clientSchema } from '../validation/schemas.js';
import { resourceController } from './resource.controller.js';
export const {create, list, getById, update, remove} = resourceController(Model, clientSchema, 'Client', {hasClient:false});
import { getClientProfitability } from '../services/profitability.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { objectId } from '../validation/schemas.js';
export const profitability = async (req,res) => {
  const id=objectId.parse(req.params.id);
  if(!await Model.exists({_id:id,workspace:req.workspaceId})) throw new AppError('Client not found',404);
  sendSuccess(res,await getClientProfitability(req.workspaceId,id),'Client profitability');
};
