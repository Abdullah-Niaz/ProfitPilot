import { financialAction } from '../services/financialAction.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Router } from "express";
import { protect, requireWorkspaceRole } from "../middlewares/auth.middleware.js";
import { idempotency } from "../middlewares/idempotency.middleware.js";
import * as ctrl from "../controllers/invoice.controller.js";

const router = Router();
router.use(asyncHandler(protect));

router.get("/", asyncHandler(requireWorkspaceRole()), asyncHandler(ctrl.list));
router.post("/", asyncHandler(requireWorkspaceRole("Owner", "Admin", "Manager", "Accountant")), idempotency(), asyncHandler(financialAction(ctrl.create)));

router.get("/:id", asyncHandler(requireWorkspaceRole()), asyncHandler(ctrl.getById));
router.patch("/:id", asyncHandler(requireWorkspaceRole("Owner", "Admin", "Manager", "Accountant")), idempotency(), asyncHandler(financialAction(ctrl.update)));
router.post("/:id/send", asyncHandler(requireWorkspaceRole("Owner", "Admin", "Manager", "Accountant")), idempotency(), asyncHandler(financialAction(ctrl.sendInvoice)));
router.post("/:id/void", asyncHandler(requireWorkspaceRole("Owner", "Admin", "Accountant")), idempotency(), asyncHandler(financialAction(ctrl.voidInvoice)));
router.delete("/:id", asyncHandler(requireWorkspaceRole("Owner", "Admin")), idempotency(), asyncHandler(financialAction(ctrl.remove)));

export default router;

