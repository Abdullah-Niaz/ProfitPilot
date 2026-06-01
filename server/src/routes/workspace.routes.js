import { Router } from "express";
import { protect, requireWorkspaceRole } from "../middlewares/auth.middleware.js";
import { getCurrentWorkspace, updateWorkspace } from "../controllers/workspace.controller.js";
const router = Router();
router.use(protect);
router.get("/current", requireWorkspaceRole(), getCurrentWorkspace);
router.patch("/current", requireWorkspaceRole("Owner", "Admin"), updateWorkspace);
export default router;
