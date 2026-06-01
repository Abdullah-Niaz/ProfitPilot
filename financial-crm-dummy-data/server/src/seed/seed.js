require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Revenue = require('../models/Revenue');
const Expense = require('../models/Expense');
const AIInsight = require('../models/AIInsight');

const {
  workspace,
  users,
  clients,
  projects,
  revenues,
  expenses,
  aiInsights
} = require('./dummyData');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for seeding');
};

const clearDatabase = async () => {
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    WorkspaceMember.deleteMany({}),
    Client.deleteMany({}),
    Project.deleteMany({}),
    Revenue.deleteMany({}),
    Expense.deleteMany({}),
    AIInsight.deleteMany({})
  ]);
};

const seedDatabase = async () => {
  await connectDB();
  await clearDatabase();

  const hashedUsers = await Promise.all(
    users.map(async user => ({
      ...user,
      password: await bcrypt.hash(user.password, 10),
      isEmailVerified: true
    }))
  );

  const createdUsers = await User.insertMany(hashedUsers.map(({ role, ...user }) => user));
  const owner = createdUsers[0];

  const createdWorkspace = await Workspace.create({
    ...workspace,
    owner: owner._id
  });

  await WorkspaceMember.insertMany(
    createdUsers.map((user, index) => ({
      workspace: createdWorkspace._id,
      user: user._id,
      role: users[index].role,
      status: 'active'
    }))
  );

  const createdClients = await Client.insertMany(
    clients.map(client => ({
      ...client,
      workspace: createdWorkspace._id
    }))
  );

  const clientMap = Object.fromEntries(createdClients.map(client => [client.name, client]));

  const createdProjects = await Project.insertMany(
    projects.map(project => ({
      workspace: createdWorkspace._id,
      client: clientMap[project.clientName]._id,
      name: project.name,
      budget: project.budget,
      status: project.status,
      deadline: project.deadline,
      description: project.description,
      assignedMembers: createdUsers.slice(1, 4).map(user => user._id)
    }))
  );

  const projectMap = Object.fromEntries(createdProjects.map(project => [project.name, project]));

  await Revenue.insertMany(
    revenues.map(revenue => ({
      workspace: createdWorkspace._id,
      client: clientMap[revenue.clientName]._id,
      project: projectMap[revenue.projectName]._id,
      amount: revenue.amount,
      type: revenue.type,
      paymentStatus: revenue.paymentStatus,
      paymentMethod: revenue.paymentMethod,
      isRecurring: revenue.isRecurring,
      date: revenue.date,
      description: revenue.description
    }))
  );

  await Expense.insertMany(
    expenses.map(expense => ({
      workspace: createdWorkspace._id,
      client: clientMap[expense.clientName]._id,
      project: projectMap[expense.projectName]._id,
      amount: expense.amount,
      category: expense.category,
      vendor: expense.vendor,
      receiptUrl: expense.receiptUrl,
      date: expense.date,
      description: expense.description
    }))
  );

  await AIInsight.insertMany(
    aiInsights.map(insight => ({
      workspace: createdWorkspace._id,
      client: clientMap[insight.clientName]._id,
      type: insight.type,
      score: insight.score,
      summary: insight.summary,
      recommendation: insight.recommendation
    }))
  );

  console.log('Seed completed successfully');
  console.log('Demo login: owner@novaagency.com / Password123!');
  await mongoose.connection.close();
};

seedDatabase().catch(async error => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
