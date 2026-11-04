import mongoose from "mongoose";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import { sendSuccess } from "../utils/apiResponse.js";

const totalCents = async (Model, match) => {
  const result = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$amountInCents" } } }
  ]);
  return result[0]?.total || 0;
};

export const overview = async (req, res) => {
  const workspace = new mongoose.Types.ObjectId(req.workspaceId);
  const basis = req.query.basis === 'cash' ? 'cash' : req.query.basis === 'accrual' ? 'accrual' : 'all';

  const revenueMatch = { workspace, status: { $ne: "Reversed" } };
  const expenseMatch = { workspace, status: { $ne: "Reversed" } };

  if (basis === 'cash') {
    revenueMatch.paymentStatus = 'Paid';
  }

  const revenueCents = await totalCents(Revenue, revenueMatch);
  const expenseCents = await totalCents(Expense, expenseMatch);

  const totalRevenue = revenueCents / 100;
  const totalExpenses = expenseCents / 100;
  const netProfit = (revenueCents - expenseCents) / 100;
  const averageMargin = revenueCents === 0 ? 0 : Number((((revenueCents - expenseCents) / revenueCents) * 100).toFixed(2));

  const activeClients = await Client.countDocuments({ workspace, status: { $ne: "Archived" } });
  const activeProjects = await Project.countDocuments({ workspace, status: "Active" });

  sendSuccess(res, {
    totalRevenue,
    totalRevenueInCents: revenueCents,
    totalExpenses,
    totalExpensesInCents: expenseCents,
    netProfit,
    netProfitInCents: revenueCents - expenseCents,
    averageMargin,
    activeClients,
    activeProjects,
    basis
  }, "Dashboard overview");
};

export const monthlyProfit = async (req, res) => {
  const workspace = new mongoose.Types.ObjectId(req.workspaceId);
  const basis = req.query.basis === 'cash' ? 'cash' : req.query.basis === 'accrual' ? 'accrual' : 'default';

  const dateField = basis === 'cash' ? '$settledDate' : basis === 'accrual' ? '$effectiveDate' : '$date';

  const revenueMatch = { workspace, status: { $ne: "Reversed" } };
  if (basis === 'cash') revenueMatch.paymentStatus = 'Paid';

  const revenues = await Revenue.aggregate([
    { $match: revenueMatch },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: [dateField, "$date"] } } },
        revenueCents: { $sum: "$amountInCents" }
      }
    }
  ]);

  const expenses = await Expense.aggregate([
    { $match: { workspace, status: { $ne: "Reversed" } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: [dateField, "$date"] } } },
        expensesCents: { $sum: "$amountInCents" }
      }
    }
  ]);

  const map = new Map();
  revenues.forEach(r => {
    if (r._id) {
      map.set(r._id, { month: r._id, revenueCents: r.revenueCents, expensesCents: 0 });
    }
  });

  expenses.forEach(e => {
    if (e._id) {
      const item = map.get(e._id) || { month: e._id, revenueCents: 0, expensesCents: 0 };
      item.expensesCents = e.expensesCents;
      map.set(e._id, item);
    }
  });

  const data = [...map.values()]
    .map(x => ({
      month: x.month,
      revenue: x.revenueCents / 100,
      expenses: x.expensesCents / 100,
      profit: (x.revenueCents - x.expensesCents) / 100
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  sendSuccess(res, data, "Monthly profit trend");
};

export const expenseBreakdown = async (req, res) => {
  const data = await Expense.aggregate([
    { $match: { workspace: new mongoose.Types.ObjectId(req.workspaceId), status: { $ne: "Reversed" } } },
    { $group: { _id: "$category", cents: { $sum: "$amountInCents" } } },
    { $project: { name: "$_id", value: { $divide: ["$cents", 100] }, _id: 0 } }
  ]);
  sendSuccess(res, data, "Expense breakdown");
};

export const clientRanking = async (req, res) => {
  const workspace = new mongoose.Types.ObjectId(req.workspaceId);

  const revenue = await Revenue.aggregate([
    { $match: { workspace, status: { $ne: "Reversed" } } },
    { $group: { _id: "$client", revenueCents: { $sum: "$amountInCents" } } }
  ]);

  const expenses = await Expense.aggregate([
    { $match: { workspace, status: { $ne: "Reversed" } } },
    { $group: { _id: "$client", expensesCents: { $sum: "$amountInCents" } } }
  ]);

  const clients = await Client.find({ workspace }).select("name industry status");
  const byClient = new Map(clients.map(c => [
    String(c._id),
    { clientId: c._id, name: c.name, industry: c.industry, status: c.status, revenueCents: 0, expensesCents: 0 }
  ]));

  revenue.forEach(r => {
    const item = byClient.get(String(r._id));
    if (item) item.revenueCents = r.revenueCents;
  });

  expenses.forEach(e => {
    const item = byClient.get(String(e._id));
    if (item) item.expensesCents = e.expensesCents;
  });

  const data = [...byClient.values()].map(x => {
    const revenue = x.revenueCents / 100;
    const exp = x.expensesCents / 100;
    const profit = (x.revenueCents - x.expensesCents) / 100;
    const margin = x.revenueCents ? Number((((x.revenueCents - x.expensesCents) / x.revenueCents) * 100).toFixed(2)) : 0;
    return {
      clientId: x.clientId,
      name: x.name,
      industry: x.industry,
      status: x.status,
      revenue,
      expenses: exp,
      profit,
      margin
    };
  }).sort((a, b) => b.profit - a.profit);

  sendSuccess(res, data, "Client profitability ranking");
};
