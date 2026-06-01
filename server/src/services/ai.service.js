import mongoose from "mongoose";
import Client from "../models/Client.js";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";
import { getClientProfitability } from "./profitability.service.js";

export const scoreClient = async (workspaceId, clientId) => {
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

  const client = await Client.findById(clientId);
  const recommendation = `${client?.name || "This client"} has ${metrics.margin}% margin with ${metrics.profit} net profit. Recommended action: ${type}.`;
  return { client: clientId, type, score, metrics, recommendation };
};

export const agencyHealthReport = async (workspaceId) => {
  const revenues = await Revenue.aggregate([{ $match: { workspace: new mongoose.Types.ObjectId(workspaceId) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const expenses = await Expense.aggregate([{ $match: { workspace: new mongoose.Types.ObjectId(workspaceId) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const totalRevenue = revenues[0]?.total || 0;
  const totalExpenses = expenses[0]?.total || 0;
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue === 0 ? 0 : Number(((profit / totalRevenue) * 100).toFixed(2));
  return { totalRevenue, totalExpenses, profit, margin, summary: margin >= 30 ? "Agency financial health is strong." : margin >= 10 ? "Agency health is acceptable but margins need improvement." : "Agency financial health is risky. Review low-margin clients and expense leakage." };
};
