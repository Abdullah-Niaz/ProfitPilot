import Client from "../models/Client.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { scoreClient, agencyHealthReport } from "../services/ai.service.js";

export const clientRecommendation = async (req, res) => sendSuccess(res, await scoreClient(req.workspaceId, req.params.clientId), "Client recommendation");
export const healthReport = async (req, res) => sendSuccess(res, await agencyHealthReport(req.workspaceId), "Agency health report");
export const retainDropSuggestions = async (req, res) => {
  const clients = await Client.find({ workspace: req.workspaceId, status: { $ne: "Archived" } }).limit(50);
  const suggestions = await Promise.all(clients.map(c => scoreClient(req.workspaceId, c._id)));
  sendSuccess(res, suggestions.sort((a,b)=>a.score-b.score), "Retain/drop suggestions");
};
