import { asyncHandler } from '../utils/asyncHandler.js';
import { Router } from "express";
import { protect, requireWorkspaceRole } from "../middlewares/auth.middleware.js";
import { getCurrentWorkspace, updateWorkspace, inviteMember, listMembers, removeMember } from "../controllers/workspace.controller.js";

const router = Router();
router.use(asyncHandler(protect));

router.get("/current", asyncHandler(requireWorkspaceRole()), asyncHandler(getCurrentWorkspace));
router.patch("/current", asyncHandler(requireWorkspaceRole("Owner", "Admin")), asyncHandler(updateWorkspace));

router.get("/current/members", asyncHandler(requireWorkspaceRole()), asyncHandler(listMembers));
router.post("/current/invitations", asyncHandler(requireWorkspaceRole("Owner", "Admin")), asyncHandler(inviteMember));
router.delete("/current/members/:id", asyncHandler(requireWorkspaceRole("Owner", "Admin")), asyncHandler(removeMember));

export default router;
