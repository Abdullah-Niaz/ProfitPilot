import express from "express";
import cors from "cors";
import helmet from "helmet";
import {observeRequest} from "./middlewares/observability.middleware.js";
import cookieParser from "cookie-parser";
import {sharedRateLimit} from "./middlewares/rateLimit.middleware.js";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import clientRoutes from "./routes/client.routes.js";
import projectRoutes from "./routes/project.routes.js";
import revenueRoutes from "./routes/revenue.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();
if(process.env.TRUST_PROXY_HOPS){
  const hops=Number(process.env.TRUST_PROXY_HOPS);
  if(!Number.isInteger(hops)||hops<1||hops>10)throw new Error('TRUST_PROXY_HOPS must be an integer from 1 to 10');
  app.set('trust proxy',hops);
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(observeRequest);
app.use(sharedRateLimit({namespace:'api', windowMs:15*60*1000,max:300}));

app.get("/api/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 200 : 503;
  res.status(status).json({
    success: isDbConnected,
    message: isDbConnected ? "API healthy" : "Database unavailable",
    data: {
      status: isDbConnected ? "healthy" : "degraded",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: isDbConnected ? "connected" : "disconnected",
      memoryUsage: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || "development"
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
