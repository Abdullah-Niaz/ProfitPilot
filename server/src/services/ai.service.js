import { AppError } from '../utils/AppError.js';
import { objectId } from '../validation/schemas.js';
import mongoose from "mongoose";
import Client from "../models/Client.js";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";
import { getClientProfitability } from "./profitability.service.js";

export const scoreClient = async (workspaceId, clientId) => {
  objectId.parse(clientId);
  const client = await Client.findOne({_id:clientId, workspace:workspaceId});
  if(!client) throw new AppError('Client not found',404);
  const metrics = await getClientProfitability(workspaceId, clientId);
  let score = 0;
  if (metrics.margin >= 50) score += 35;
  else if (metrics.margin >= 25) score += 25;
  else if (metrics.margin >= 10) score += 15;
  else score += 5;

  if (metrics.profit > 0) score += 20;
  if (metrics.revenue >= 10000) score += 15;
  if (metrics.expenses / Math.max(metrics.revenue, 1) < 0.5) score += 15;
  if (metrics.margin > 0) score += 15;
  score = Math.min(score, 100);

  let type = "Drop";
  if (score >= 80) type = "Retain";
  else if (score >= 65) type = "Upsell";
  else if (score >= 45) type = "Monitor";
  else if (score >= 30) type = "Renegotiate";

  const recommendation = `${client?.name || "This client"} has ${metrics.margin}% margin with ${metrics.profit} net profit. Recommended action: ${type}.`;
  return { client: clientId, type, score, metrics, recommendation };
};

export const agencyHealthReport = async (workspaceId) => {
  const ws = new mongoose.Types.ObjectId(workspaceId);
  const revMatch = { workspace: ws, status: { $ne: "Reversed" } };
  const expMatch = { workspace: ws, status: { $ne: "Reversed" } };

  const revenues = await Revenue.aggregate([
    { $match: revMatch },
    { $group: { _id: null, totalCents: { $sum: "$amountInCents" } } }
  ]);
  const expenses = await Expense.aggregate([
    { $match: expMatch },
    { $group: { _id: null, totalCents: { $sum: "$amountInCents" } } }
  ]);

  const revCents = revenues[0]?.totalCents || 0;
  const expCents = expenses[0]?.totalCents || 0;
  const totalRevenue = revCents / 100;
  const totalExpenses = expCents / 100;
  const profit = (revCents - expCents) / 100;
  const margin = revCents === 0 ? 0 : Number((((revCents - expCents) / revCents) * 100).toFixed(2));

  return {
    totalRevenue,
    totalExpenses,
    profit,
    margin,
    summary: margin >= 30
      ? "Agency financial health is strong."
      : margin >= 10
      ? "Agency health is acceptable but margins need improvement."
      : "Agency financial health is risky. Review low-margin clients and expense leakage."
  };
};
