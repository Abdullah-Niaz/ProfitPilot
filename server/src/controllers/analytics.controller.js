import mongoose from "mongoose";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import { sendSuccess } from "../utils/apiResponse.js";

const total = async (Model, workspace) => (await Model.aggregate([{ $match: { workspace } }, { $group: { _id: null, total: { $sum: "$amount" } } }]))[0]?.total || 0;

export const overview = async (req, res) => {
  const workspace = new mongoose.Types.ObjectId(req.workspaceId);
  const totalRevenue = await total(Revenue, workspace);
  const totalExpenses = await total(Expense, workspace);
  const netProfit = totalRevenue - totalExpenses;
  const averageMargin = totalRevenue === 0 ? 0 : Number(((netProfit / totalRevenue) * 100).toFixed(2));
  const activeClients = await Client.countDocuments({ workspace, status: { $ne: "Archived" } });
  const activeProjects = await Project.countDocuments({ workspace, status: "Active" });
  sendSuccess(res, { totalRevenue, totalExpenses, netProfit, averageMargin, activeClients, activeProjects }, "Dashboard overview");
};

export const monthlyProfit = async (req, res) => {
  const workspace = new mongoose.Types.ObjectId(req.workspaceId);
  const revenues = await Revenue.aggregate([{ $match: { workspace } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, revenue: { $sum: "$amount" } } }]);
  const expenses = await Expense.aggregate([{ $match: { workspace } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, expenses: { $sum: "$amount" } } }]);
  const map = new Map();
  revenues.forEach(r => map.set(r._id, { month: r._id, revenue: r.revenue, expenses: 0 }));
  expenses.forEach(e => map.set(e._id, { ...(map.get(e._id) || { month: e._id, revenue: 0 }), expenses: e.expenses }));
  const data = [...map.values()].map(x => ({ ...x, profit: x.revenue - x.expenses })).sort((a,b)=>a.month.localeCompare(b.month));
  sendSuccess(res, data, "Monthly profit trend");
};

export const expenseBreakdown = async (req, res) => {
  const data = await Expense.aggregate([{ $match: { workspace: req.workspaceId } }, { $group: { _id: "$category", value: { $sum: "$amount" } } }, { $project: { name: "$_id", value: 1, _id: 0 } }]);
  sendSuccess(res, data, "Expense breakdown");
};

export const clientRanking = async (req, res) => {
  const workspace = new mongoose.Types.ObjectId(req.workspaceId);
  const revenue = await Revenue.aggregate([{ $match: { workspace } }, { $group: { _id: "$client", revenue: { $sum: "$amount" } } }]);
  const expenses = await Expense.aggregate([{ $match: { workspace } }, { $group: { _id: "$client", expenses: { $sum: "$amount" } } }]);
  const clients = await Client.find({ workspace }).select("name industry status");
  const byClient = new Map(clients.map(c => [String(c._id), { clientId: c._id, name: c.name, industry: c.industry, status: c.status, revenue: 0, expenses: 0 }]));
  revenue.forEach(r => { const item = byClient.get(String(r._id)); if (item) item.revenue = r.revenue; });
  expenses.forEach(e => { const item = byClient.get(String(e._id)); if (item) item.expenses = e.expenses; });
  const data = [...byClient.values()].map(x => ({ ...x, profit: x.revenue - x.expenses, margin: x.revenue ? Number((((x.revenue-x.expenses)/x.revenue)*100).toFixed(2)) : 0 })).sort((a,b)=>b.profit-a.profit);
  sendSuccess(res, data, "Client profitability ranking");
};
