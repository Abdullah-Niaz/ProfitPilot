import { Router } from "express";
import { protect, requireWorkspaceRole } from "../middlewares/auth.middleware.js";
import { clientRecommendation, healthReport, retainDropSuggestions } from "../controllers/ai.controller.js";
const router = Router();
router.use(protect, requireWorkspaceRole("Owner", "Admin", "Manager", "Accountant"));
router.get("/agency-health-report", healthReport);
router.get("/retain-drop-suggestions", retainDropSuggestions);
router.post("/client-recommendation/:clientId", clientRecommendation);
export default router;
