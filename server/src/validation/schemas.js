import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID');
const text = (max = 200) => z.string().trim().max(max);
export const money = z.number().finite().min(0).max(Math.floor(Number.MAX_SAFE_INTEGER / 100)).refine(
  val => {
    const cents = Math.round(val * 100);
    return Number.isSafeInteger(cents) && Math.abs(val - cents / 100) <= Number.EPSILON * Math.max(1, Math.abs(val)) * 2;
  },
  'Amount cannot have more than 2 decimal places'
);
export const positiveMoney = money.refine(val => val > 0, 'Amount must be greater than zero');
export const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code');

const date = z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format').transform(value => new Date(value));
const optionalUrl = z.union([z.literal(''), z.string().url().max(2048).refine(value => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS URL')]);

export const clientSchema = z.object({
  name: text().min(1),
  email: z.union([z.literal(''), z.string().email().max(254)]).optional(),
  phone: text(50).optional(),
  industry: text(100).optional(),
  notes: text(5000).optional(),
  status: z.enum(['Active', 'At Risk', 'Profitable', 'Low Margin', 'Loss Making', 'Archived']).optional(),
}).strict();

export const projectSchema = z.object({
  name: text().min(1),
  client: objectId,
  budget: money.optional(),
  currency: currencySchema.optional(),
  deadline: date.nullable().optional(),
  status: z.enum(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']).optional(),
  assignedMembers: z.array(objectId).max(100).refine(ids => new Set(ids).size === ids.length, 'Duplicate members').optional(),
}).strict();

export const revenueSchema = z.object({
  client: objectId,
  project: objectId.nullable().optional(),
  amount: money,
  currency: currencySchema.optional(),
  type: z.enum(['One-Time Payment', 'Monthly Retainer', 'Milestone Payment', 'Subscription', 'Maintenance Fee']),
  paymentStatus: z.enum(['Paid', 'Pending', 'Overdue']).optional(),
  paymentMethod: text(100).optional(),
  date: date.optional(),
  effectiveDate: date.optional(),
  settledDate: date.nullable().optional(),
}).strict();

export const expenseSchema = z.object({
  client: objectId,
  project: objectId.nullable().optional(),
  amount: money,
  currency: currencySchema.optional(),
  category: z.enum(['Team Salary', 'Freelancer Cost', 'Software Subscription', 'Hosting', 'Marketing', 'Operations', 'Client-Specific Cost', 'Miscellaneous']),
  receiptUrl: optionalUrl.optional(),
  date: date.optional(),
  effectiveDate: date.optional(),
  settledDate: date.nullable().optional(),
}).strict();

export const reversalSchema = z.object({
  reason: text(500).min(3, 'Reversal reason must be at least 3 characters')
}).strict();

export const invoiceLineItemSchema = z.object({
  description: text(200).min(1, 'Description required'),
  quantity: z.number().int().min(1).default(1),
  unitPrice: money.optional(),
  amount: money.optional(),
}).strict();

const invoiceFields = z.object({
  client: objectId,
  project: objectId.nullable().optional(),
  invoiceNo: text(50).min(1).optional(),
  amount: money.optional(),
  totalAmount: money.optional(),
  currency: currencySchema.optional(),
  issueDate: date.optional(),
  dueDate: date.optional(),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  notes: text(5000).optional(),
}).strict();
export const invoiceUpdateSchema = invoiceFields.partial().refine(value => Object.keys(value).length > 0, 'No changes supplied');
export const invoiceSchema = invoiceFields.refine(
  data => data.amount !== undefined || data.totalAmount !== undefined || (data.lineItems && data.lineItems.length > 0),
  'Invoice requires amount or line items'
);

export const paymentSchema = z.object({
  client: objectId.optional(),
  project: objectId.nullable().optional(),
  invoice: objectId.optional(),
  amount: positiveMoney,
  currency: currencySchema.optional(),
  paymentMethod: z.enum(['Bank Transfer', 'Credit Card', 'Cash', 'Stripe', 'PayPal', 'Check', 'Other']).optional(),
  reference: text(100).optional(),
  paidAt: date.optional(),
  notes: text(2000).optional(),
}).strict().refine(
  data => data.client !== undefined || data.invoice !== undefined,
  'Payment requires a client or invoice reference'
);

export const workspaceSchema = z.object({
  name: text().min(1).optional(),
  logo: optionalUrl.optional(),
  industry: text(100).optional(),
  currency: currencySchema.optional(),
  timezone: text(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Invalid time zone').optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'No changes supplied');

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes');
export const registrationSchema = z.object({name: text(100).min(1), email, password, workspaceName: text().min(1).optional()}).strict();
export const loginSchema = z.object({email, password: z.string().min(1).max(128)}).strict();
export const forgotPasswordSchema = z.object({email}).strict();
export const resetPasswordSchema = z.object({email, token: z.string().min(10).max(128), newPassword: password}).strict();
export const inviteMemberSchema = z.object({
  email,
  role: z.enum(['Admin', 'Manager', 'Accountant', 'Team Member'])
}).strict();
export const listSchema = z.object({
  status: text(50).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  client: objectId.optional(),
  project: objectId.optional(),
  invoice: objectId.optional(),
  basis: z.enum(['cash', 'accrual']).optional(),
}).strict();

export const actionTokenSchema = z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const acceptInvitationSchema = actionTokenSchema.extend({password:z.string().max(128).optional(),newPassword:password.optional()});
