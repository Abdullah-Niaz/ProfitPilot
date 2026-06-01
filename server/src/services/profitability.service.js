import mongoose from "mongoose";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";

const sumAmounts = async (Model, filter) => {
  const result = await Model.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  return result[0]?.total || 0;
};

export const getClientProfitability = async (workspaceId, clientId) => {
  const filter = { workspace: new mongoose.Types.ObjectId(workspaceId), client: new mongoose.Types.ObjectId(clientId) };
  const revenue = await sumAmounts(Revenue, filter);
  const expenses = await sumAmounts(Expense, filter);
  const profit = revenue - expenses;
  const margin = revenue === 0 ? 0 : Number(((profit / revenue) * 100).toFixed(2));
  return { revenue, expenses, profit, margin };
};

export const getProjectProfitability = async (workspaceId, projectId) => {
  const filter = { workspace: new mongoose.Types.ObjectId(workspaceId), project: new mongoose.Types.ObjectId(projectId) };
  const revenue = await sumAmounts(Revenue, filter);
  const expenses = await sumAmounts(Expense, filter);
  const profit = revenue - expenses;
  const margin = revenue === 0 ? 0 : Number(((profit / revenue) * 100).toFixed(2));
  return { revenue, expenses, profit, margin };
};
