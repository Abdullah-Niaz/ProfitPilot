import { AppError } from '../utils/AppError.js';

export function invoiceAmounts(data, current = {}) {
  const lines = data.lineItems ?? current.lineItems ?? [];
  const lineItems = lines.map(item => {
    const quantity = item.quantity ?? 1;
    const unitPriceInCents = item.unitPrice !== undefined ? Math.round(item.unitPrice * 100) : item.unitPriceInCents;
    const amountInCents = item.amount !== undefined ? Math.round(item.amount * 100)
      : unitPriceInCents !== undefined ? quantity * unitPriceInCents : item.amountInCents;
    if (!Number.isSafeInteger(amountInCents) || amountInCents < 0) {
      throw new AppError('Every line item needs a valid amount or unit price', 400);
    }
    if (item.amount !== undefined && unitPriceInCents !== undefined && amountInCents !== quantity * unitPriceInCents) {
      throw new AppError('Line amount must equal quantity multiplied by unit price', 400);
    }
    return { description: item.description, quantity, unitPrice: item.unitPrice, unitPriceInCents, amountInCents };
  });
  const explicit = data.totalAmount ?? data.amount;
  if (data.totalAmount !== undefined && data.amount !== undefined && Math.round(data.totalAmount * 100) !== Math.round(data.amount * 100)) {
    throw new AppError('Invoice amount and total must match', 400);
  }
  const lineTotal = lineItems.reduce((sum, item) => sum + item.amountInCents, 0);
  const cents = explicit !== undefined ? Math.round(explicit * 100) : lineItems.length ? lineTotal : current.totalAmountInCents;
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new AppError('Invoice total must be a positive safe monetary amount', 400);
  if (lineItems.length && cents !== lineTotal) throw new AppError('Invoice total must match its line items', 400);
  return { lineItems, totalAmountInCents: cents, amount: cents / 100, balanceDueInCents: cents, balanceDue: cents / 100 };
}
