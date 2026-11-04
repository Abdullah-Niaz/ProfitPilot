import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';
import Revenue from '../models/Revenue.js';
import Expense from '../models/Expense.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Project from '../models/Project.js';

export async function runFinancialMigration() {
  const stats = {
    workspaces: 0,
    revenuesMigrated: 0,
    expensesMigrated: 0,
    invoicesMigrated: 0,
    paymentsMigrated: 0,
    projectsMigrated: 0
  };

  const workspaces = await Workspace.find().lean();
  const workspaceCurrencyMap = new Map();
  for (const ws of workspaces) {
    workspaceCurrencyMap.set(String(ws._id), ws.currency || 'USD');
    stats.workspaces++;
  }

  // Migrate Revenues
  const revenues = await Revenue.find({
    $or: [
      { amountInCents: { $exists: false } },
      { currency: { $exists: false } },
      { status: { $exists: false } },
      { effectiveDate: { $exists: false } }
    ]
  }).lean();
  for (const rev of revenues) {
    const wsCurrency = workspaceCurrencyMap.get(String(rev.workspace)) || 'USD';
    const amountInCents = rev.amountInCents !== undefined ? rev.amountInCents : Math.round((rev.amount || 0) * 100);
    const currency = rev.currency || wsCurrency;
    const status = rev.status || 'Posted';
    const effectiveDate = rev.effectiveDate || rev.date || rev.createdAt || new Date();
    const settledDate = rev.settledDate || (rev.paymentStatus === 'Paid' ? (rev.date || rev.createdAt) : null);

    await Revenue.updateOne(
      { _id: rev._id },
      {
        $set: {
          amountInCents,
          currency,
          status,
          effectiveDate,
          settledDate
        }
      }
    );
    stats.revenuesMigrated++;
  }

  // Migrate Expenses
  const expenses = await Expense.find({
    $or: [
      { amountInCents: { $exists: false } },
      { currency: { $exists: false } },
      { status: { $exists: false } },
      { effectiveDate: { $exists: false } }
    ]
  }).lean();
  for (const exp of expenses) {
    const wsCurrency = workspaceCurrencyMap.get(String(exp.workspace)) || 'USD';
    const amountInCents = exp.amountInCents !== undefined ? exp.amountInCents : Math.round((exp.amount || 0) * 100);
    const currency = exp.currency || wsCurrency;
    const status = exp.status || 'Posted';
    const effectiveDate = exp.effectiveDate || exp.date || exp.createdAt || new Date();
    const settledDate = exp.settledDate || exp.date || exp.createdAt || new Date();

    await Expense.updateOne(
      { _id: exp._id },
      {
        $set: {
          amountInCents,
          currency,
          status,
          effectiveDate,
          settledDate
        }
      }
    );
    stats.expensesMigrated++;
  }

  // Migrate Invoices
  const invoices = await Invoice.find({
    $or: [
      { totalAmountInCents: { $exists: false } },
      { balanceDueInCents: { $exists: false } },
      { currency: { $exists: false } }
    ]
  }).lean();
  for (const inv of invoices) {
    const wsCurrency = workspaceCurrencyMap.get(String(inv.workspace)) || 'USD';
    const totalAmountInCents = inv.totalAmountInCents !== undefined ? inv.totalAmountInCents : Math.round((inv.amount || 0) * 100);
    const amountPaidInCents = inv.amountPaidInCents !== undefined ? inv.amountPaidInCents : Math.round((inv.amountPaid || 0) * 100);
    const balanceDueInCents = Math.max(0, totalAmountInCents - amountPaidInCents);

    await Invoice.updateOne(
      { _id: inv._id },
      {
        $set: {
          totalAmountInCents,
          amountPaidInCents,
          balanceDueInCents,
          currency: inv.currency || wsCurrency
        }
      }
    );
    stats.invoicesMigrated++;
  }

  // Migrate Payments
  const payments = await Payment.find({
    $or: [
      { amountInCents: { $exists: false } },
      { currency: { $exists: false } },
      { status: { $exists: false } }
    ]
  }).lean();
  for (const pay of payments) {
    const wsCurrency = workspaceCurrencyMap.get(String(pay.workspace)) || 'USD';
    const amountInCents = pay.amountInCents !== undefined ? pay.amountInCents : Math.round((pay.amount || 0) * 100);

    await Payment.updateOne(
      { _id: pay._id },
      {
        $set: {
          amountInCents,
          currency: pay.currency || wsCurrency,
          status: pay.status || 'Posted'
        }
      }
    );
    stats.paymentsMigrated++;
  }

  // Migrate Projects
  const projects = await Project.find({
    $or: [
      { budgetInCents: { $exists: false } },
      { currency: { $exists: false } }
    ]
  }).lean();
  for (const proj of projects) {
    const wsCurrency = workspaceCurrencyMap.get(String(proj.workspace)) || 'USD';
    const budgetInCents = proj.budgetInCents !== undefined ? proj.budgetInCents : Math.round((proj.budget || 0) * 100);

    await Project.updateOne(
      { _id: proj._id },
      {
        $set: {
          budgetInCents,
          currency: proj.currency || wsCurrency
        }
      }
    );
    stats.projectsMigrated++;
  }

  return stats;
}

if (process.argv[1] && process.argv[1].endsWith('phase2_financial_migration.js')) {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/financial_crm';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);
  const result = await runFinancialMigration();
  console.log('Migration completed successfully:', result);
  await mongoose.disconnect();
}

