const bcrypt = require('bcryptjs');

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const workspace = {
  name: 'Nova Digital Agency',
  industry: 'Software Development & Marketing',
  currency: 'USD',
  timezone: 'Asia/Karachi',
  logo: 'https://ui-avatars.com/api/?name=Nova+Digital&background=2563eb&color=fff'
};

const users = [
  { name: 'Abdullah Niaz', email: 'owner@novaagency.com', password: 'Password123!', role: 'Owner' },
  { name: 'Sarah Khan', email: 'manager@novaagency.com', password: 'Password123!', role: 'Manager' },
  { name: 'Ali Ahmed', email: 'accountant@novaagency.com', password: 'Password123!', role: 'Accountant' },
  { name: 'Maya Roberts', email: 'admin@novaagency.com', password: 'Password123!', role: 'Admin' },
  { name: 'Hamza Farooq', email: 'team@novaagency.com', password: 'Password123!', role: 'Team Member' }
];

const clients = [
  { name: 'FinCore Labs', email: 'finance@fincorelabs.com', phone: '+1 415 555 1101', industry: 'Fintech', status: 'Profitable', notes: 'High-value fintech client with strong retainer potential.' },
  { name: 'TechNova Systems', email: 'hello@technova.io', phone: '+1 212 555 2202', industry: 'SaaS', status: 'Profitable', notes: 'Strong margins and fast approvals.' },
  { name: 'HealthSync Care', email: 'ops@healthsync.com', phone: '+44 20 5555 3303', industry: 'Healthcare', status: 'Active', notes: 'Stable healthcare project pipeline.' },
  { name: 'EduTrack Global', email: 'admin@edutrack.org', phone: '+61 2 5555 4404', industry: 'EdTech', status: 'Low Margin', notes: 'Requires scope control and better pricing.' },
  { name: 'RetailFlow Commerce', email: 'growth@retailflow.com', phone: '+1 646 555 5505', industry: 'Ecommerce', status: 'Loss Making', notes: 'High support requests and low pricing.' },
  { name: 'UrbanNest Realty', email: 'sales@urbannest.com', phone: '+971 4 555 6606', industry: 'Real Estate', status: 'Active', notes: 'Good growth potential in property tech.' },
  { name: 'LegalBridge Partners', email: 'contact@legalbridge.co', phone: '+44 161 555 7707', industry: 'Legal Services', status: 'At Risk', notes: 'Slow payment behavior.' },
  { name: 'FoodKart Express', email: 'product@foodkart.app', phone: '+91 80 5555 8808', industry: 'Food Delivery', status: 'Low Margin', notes: 'Needs automation to reduce delivery cost.' },
  { name: 'GreenGrid Energy', email: 'info@greengrid.energy', phone: '+49 30 5555 9909', industry: 'Clean Energy', status: 'Profitable', notes: 'Long-term sustainable tech client.' },
  { name: 'FitPulse Studio', email: 'team@fitpulse.co', phone: '+1 305 555 1010', industry: 'Fitness', status: 'Active', notes: 'Monthly maintenance and feature upgrades.' },
  { name: 'AutoPilot Logistics', email: 'ops@autopilotlogistics.com', phone: '+31 20 555 2020', industry: 'Logistics', status: 'Profitable', notes: 'Strong enterprise automation opportunity.' },
  { name: 'Craftly Brands', email: 'creative@craftlybrands.com', phone: '+1 512 555 3030', industry: 'Branding', status: 'Active', notes: 'Design-heavy account with recurring campaigns.' }
];

const projectTemplates = [
  'Client Portal', 'Analytics Dashboard', 'CRM Automation', 'Landing Page System', 'Mobile App Backend',
  'Admin Panel', 'Booking Platform', 'Billing Module', 'Marketing Website', 'Data Migration',
  'AI Recommendation Engine', 'Ecommerce Optimization', 'Workflow Automation', 'Reporting Suite', 'Customer Support Portal'
];

const revenueTypes = ['One-Time Payment', 'Monthly Retainer', 'Milestone Payment', 'Subscription', 'Maintenance Fee'];
const paymentStatuses = ['Paid', 'Paid', 'Paid', 'Pending', 'Overdue'];
const paymentMethods = ['Bank Transfer', 'Stripe', 'PayPal', 'Wise', 'Credit Card'];
const expenseCategories = ['Team Salary', 'Freelancer Cost', 'Software Subscription', 'Hosting', 'Marketing', 'Operations', 'Client-Specific Cost', 'Miscellaneous'];
const projectStatuses = ['Planning', 'Active', 'Active', 'Completed', 'On Hold'];

function amountForClient(clientName, type) {
  const profiles = {
    'FinCore Labs': { revenue: [5000, 9000], expense: [1200, 3500] },
    'TechNova Systems': { revenue: [4000, 7500], expense: [1000, 2800] },
    'HealthSync Care': { revenue: [3000, 6000], expense: [1800, 4300] },
    'EduTrack Global': { revenue: [1800, 4200], expense: [1600, 3900] },
    'RetailFlow Commerce': { revenue: [1200, 3500], expense: [2500, 5200] },
    'UrbanNest Realty': { revenue: [2500, 5200], expense: [1300, 3600] },
    'LegalBridge Partners': { revenue: [1800, 4000], expense: [1600, 4200] },
    'FoodKart Express': { revenue: [2200, 4400], expense: [2000, 4600] },
    'GreenGrid Energy': { revenue: [4500, 8500], expense: [1200, 3200] },
    'FitPulse Studio': { revenue: [2000, 4500], expense: [1200, 3200] },
    'AutoPilot Logistics': { revenue: [5000, 9500], expense: [1500, 3800] },
    'Craftly Brands': { revenue: [1800, 4300], expense: [1100, 3000] }
  };
  const range = profiles[clientName][type];
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(monthIndex) {
  const day = Math.floor(Math.random() * 25) + 1;
  return new Date(2026, monthIndex, day).toISOString();
}

function generateProjects() {
  const projects = [];
  clients.forEach((client, clientIndex) => {
    const count = clientIndex % 3 === 0 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      projects.push({
        name: `${client.name} ${projectTemplates[(clientIndex + i) % projectTemplates.length]}`,
        clientName: client.name,
        budget: amountForClient(client.name, 'revenue') * 2,
        status: randomItem(projectStatuses),
        deadline: new Date(2026, (clientIndex + i + 6) % 12, 20).toISOString(),
        description: `Professional ${projectTemplates[(clientIndex + i) % projectTemplates.length].toLowerCase()} project for ${client.name}.`
      });
    }
  });
  return projects;
}

const projects = generateProjects();

function generateRevenues() {
  const revenues = [];
  for (let month = 0; month < 12; month++) {
    clients.forEach((client, index) => {
      const entries = index % 4 === 0 ? 2 : 1;
      for (let i = 0; i < entries; i++) {
        const clientProjects = projects.filter(p => p.clientName === client.name);
        revenues.push({
          clientName: client.name,
          projectName: randomItem(clientProjects).name,
          amount: amountForClient(client.name, 'revenue'),
          type: randomItem(revenueTypes),
          paymentStatus: randomItem(paymentStatuses),
          paymentMethod: randomItem(paymentMethods),
          isRecurring: Math.random() > 0.45,
          date: randomDate(month),
          description: `${randomItem(revenueTypes)} received from ${client.name}`
        });
      }
    });
  }
  return revenues;
}

function generateExpenses() {
  const expenses = [];
  for (let month = 0; month < 12; month++) {
    clients.forEach((client, index) => {
      const entries = index % 3 === 0 ? 3 : 2;
      for (let i = 0; i < entries; i++) {
        const clientProjects = projects.filter(p => p.clientName === client.name);
        const category = randomItem(expenseCategories);
        expenses.push({
          clientName: client.name,
          projectName: randomItem(clientProjects).name,
          amount: amountForClient(client.name, 'expense'),
          category,
          vendor: category === 'Software Subscription' ? 'SaaS Tool Vendor' : category === 'Hosting' ? 'Cloud Provider' : 'Operations Vendor',
          receiptUrl: '',
          date: randomDate(month),
          description: `${category} expense allocated to ${client.name}`
        });
      }
    });
  }
  return expenses;
}

const revenues = generateRevenues();
const expenses = generateExpenses();

function calculateClientSummary(clientName) {
  const totalRevenue = revenues.filter(r => r.clientName === clientName).reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.filter(e => e.clientName === clientName).reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue === 0 ? 0 : Number(((profit / totalRevenue) * 100).toFixed(1));
  return { totalRevenue, totalExpenses, profit, margin };
}

function recommendationFromMargin(margin, profit) {
  if (margin >= 55) return { type: 'Retain', score: 92 };
  if (margin >= 40) return { type: 'Upsell', score: 82 };
  if (margin >= 20) return { type: 'Monitor', score: 63 };
  if (profit > 0) return { type: 'Renegotiate', score: 44 };
  return { type: 'Drop', score: 18 };
}

const aiInsights = clients.map(client => {
  const summary = calculateClientSummary(client.name);
  const rec = recommendationFromMargin(summary.margin, summary.profit);
  return {
    clientName: client.name,
    type: rec.type,
    score: rec.score,
    summary: `${client.name} generated $${summary.totalRevenue.toLocaleString()} revenue with $${summary.totalExpenses.toLocaleString()} expenses and a ${summary.margin}% profit margin.`,
    recommendation: rec.type === 'Retain'
      ? 'Retain this client and prioritize long-term relationship growth.'
      : rec.type === 'Upsell'
      ? 'Client is profitable and suitable for upsell or expanded service packages.'
      : rec.type === 'Monitor'
      ? 'Monitor delivery cost, project delays, and margin movement over the next cycle.'
      : rec.type === 'Renegotiate'
      ? 'Renegotiate pricing or reduce delivery cost before accepting more work.'
      : 'Consider dropping or restructuring this account because it is hurting profitability.'
  };
});

module.exports = {
  workspace,
  users,
  clients,
  projects,
  revenues,
  expenses,
  aiInsights,
  months
};
