import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import clientRoutes from "./routes/client.routes.js";
import projectRoutes from "./routes/project.routes.js";
import revenueRoutes from "./routes/revenue.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api/health", (req, res) => res.json({ success: true, message: "API healthy" }));
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
