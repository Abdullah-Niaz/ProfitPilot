import { Router } from "express";
import { protect, requireWorkspaceRole } from "../middlewares/auth.middleware.js";
import * as ctrl from "../controllers/revenue.controller.js";
const router = Router();
router.use(protect);
router.get("/", requireWorkspaceRole(), ctrl.list);
router.post("/", requireWorkspaceRole("Owner", "Admin", "Manager", "Accountant"), ctrl.create);

router.get("/:id", requireWorkspaceRole(), ctrl.getById);
router.patch("/:id", requireWorkspaceRole("Owner", "Admin", "Manager", "Accountant"), ctrl.update);
router.delete("/:id", requireWorkspaceRole("Owner", "Admin"), ctrl.remove);
export default router;
