import "dotenv/config";
import { assertSeedAllowed } from "./guard.js";
import AuthSession from "../models/AuthSession.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import Revenue from "../models/Revenue.js";
import Expense from "../models/Expense.js";

assertSeedAllowed(process.env);
await connectDB();
await Promise.all([
  AuthSession.deleteMany(),
  User.deleteMany(),
  Workspace.deleteMany(),
  WorkspaceMember.deleteMany(),
  Client.deleteMany(),
  Project.deleteMany(),
  Revenue.deleteMany(),
  Expense.deleteMany(),
]);

const user = await User.create({
  name: "Agency Owner",
  email: "owner@agencycrm.com",
  password: process.env.DEMO_PASSWORD,
  isEmailVerified: true,
});
const workspace = await Workspace.create({
  name: "Nova Growth Studio",
  owner: user._id,
  industry: "Digital Agency",
  currency: "USD",
});
await WorkspaceMember.create({
  workspace: workspace._id,
  user: user._id,
  role: "Owner",
  status: "active",
});

const clients = await Client.insertMany([
  {
    workspace: workspace._id,
    name: "TechNova",
    email: "finance@technova.com",
    industry: "SaaS",
    status: "Profitable",
  },
  {
    workspace: workspace._id,
    name: "ABC Startup",
    email: "founder@abc.com",
    industry: "FinTech",
    status: "Low Margin",
  },
  {
    workspace: workspace._id,
    name: "RetailPro",
    email: "ops@retailpro.com",
    industry: "Ecommerce",
    status: "Active",
  },
  {
    workspace: workspace._id,
    name: "ClinicPlus",
    email: "admin@clinicplus.com",
    industry: "Healthcare",
    status: "At Risk",
  },
]);

const projects = await Project.insertMany([
  {
    workspace: workspace._id,
    client: clients[0]._id,
    name: "SaaS Landing & Funnel",
    budget: 12000,
    status: "Completed",
    deadline: new Date(),
  },
  {
    workspace: workspace._id,
    client: clients[1]._id,
    name: "MVP Product Build",
    budget: 8000,
    status: "Active",
    deadline: new Date(),
  },
  {
    workspace: workspace._id,
    client: clients[2]._id,
    name: "Ecommerce Analytics",
    budget: 10000,
    status: "Active",
    deadline: new Date(),
  },
  {
    workspace: workspace._id,
    client: clients[3]._id,
    name: "Patient Portal Redesign",
    budget: 6000,
    status: "On Hold",
    deadline: new Date(),
  },
]);

await Revenue.insertMany([
  {
    workspace: workspace._id,
    client: clients[0]._id,
    project: projects[0]._id,
    amount: 12000,
    type: "Milestone Payment",
    paymentStatus: "Paid",
    date: new Date("2026-01-15"),
  },
  {
    workspace: workspace._id,
    client: clients[1]._id,
    project: projects[1]._id,
    amount: 8000,
    type: "One-Time Payment",
    paymentStatus: "Paid",
    date: new Date("2026-02-10"),
  },
  {
    workspace: workspace._id,
    client: clients[2]._id,
    project: projects[2]._id,
    amount: 10000,
    type: "Monthly Retainer",
    paymentStatus: "Paid",
    date: new Date("2026-03-12"),
  },
  {
    workspace: workspace._id,
    client: clients[3]._id,
    project: projects[3]._id,
    amount: 6000,
    type: "Milestone Payment",
    paymentStatus: "Pending",
    date: new Date("2026-04-05"),
  },
]);

await Expense.insertMany([
  {
    workspace: workspace._id,
    client: clients[0]._id,
    project: projects[0]._id,
    amount: 4000,
    category: "Team Salary",
    date: new Date("2026-01-20"),
  },
  {
    workspace: workspace._id,
    client: clients[1]._id,
    project: projects[1]._id,
    amount: 7200,
    category: "Freelancer Cost",
    date: new Date("2026-02-17"),
  },
  {
    workspace: workspace._id,
    client: clients[2]._id,
    project: projects[2]._id,
    amount: 5200,
    category: "Software Subscription",
    date: new Date("2026-03-18"),
  },
  {
    workspace: workspace._id,
    client: clients[3]._id,
    project: projects[3]._id,
    amount: 5900,
    category: "Operations",
    date: new Date("2026-04-11"),
  },
]);

console.log("Seed complete. Use the demo email and the password you supplied.");
await mongoose.disconnect();
