import mongoose from "mongoose";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";

const sumCents = async (Model, filter) => {
  const result = await Model.aggregate([
    { $match: { ...filter, status: { $ne: "Reversed" } } },
    {
      $group: {
        _id: null,
        totalCents: {
          $sum: {
            $ifNull: ["$amountInCents", { $round: [{ $multiply: ["$amount", 100] }, 0] }]
          }
        }
      }
    }
  ]);
  return result[0]?.totalCents || 0;
};

export const getClientProfitability = async (workspaceId, clientId) => {
  const filter = {
    workspace: new mongoose.Types.ObjectId(workspaceId),
    client: new mongoose.Types.ObjectId(clientId)
  };
  const revenueCents = await sumCents(Revenue, filter);
  const expensesCents = await sumCents(Expense, filter);
  const profitCents = revenueCents - expensesCents;
  const revenue = revenueCents / 100;
  const expenses = expensesCents / 100;
  const profit = profitCents / 100;
  const margin = revenueCents === 0 ? 0 : Number(((profitCents / revenueCents) * 100).toFixed(2));
  return { revenue, expenses, profit, margin, revenueInCents: revenueCents, expensesInCents: expensesCents, profitInCents: profitCents };
};

export const getProjectProfitability = async (workspaceId, projectId) => {
  const filter = {
    workspace: new mongoose.Types.ObjectId(workspaceId),
    project: new mongoose.Types.ObjectId(projectId)
  };
  const revenueCents = await sumCents(Revenue, filter);
  const expensesCents = await sumCents(Expense, filter);
  const profitCents = revenueCents - expensesCents;
  const revenue = revenueCents / 100;
  const expenses = expensesCents / 100;
  const profit = profitCents / 100;
  const margin = revenueCents === 0 ? 0 : Number(((profitCents / revenueCents) * 100).toFixed(2));
  return { revenue, expenses, profit, margin, revenueInCents: revenueCents, expensesInCents: expensesCents, profitInCents: profitCents };
};
