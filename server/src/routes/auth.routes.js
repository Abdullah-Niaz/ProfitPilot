import {requestVerification,verifyEmail,acceptInvitation} from '../controllers/onboarding.controller.js';
import { trustedOrigin } from '../middlewares/origin.middleware.js';
import {sharedRateLimit} from '../middlewares/rateLimit.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Router } from "express";
import { register, login, refreshToken, me, logout, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(trustedOrigin);

const authLimit = sharedRateLimit({namespace:'auth',windowMs:15*60*1000,max:30});
router.post("/register", authLimit, asyncHandler(register));
router.post("/login", authLimit, asyncHandler(login));
router.post("/refresh-token", asyncHandler(refreshToken));
router.post("/logout", asyncHandler(logout));
router.post("/forgot-password", authLimit, asyncHandler(forgotPassword));
router.post("/reset-password", authLimit, asyncHandler(resetPassword));
router.post('/accept-invitation', authLimit, asyncHandler(acceptInvitation));
router.post('/verify-email', authLimit, asyncHandler(verifyEmail));
router.post('/request-verification', authLimit, asyncHandler(protect), asyncHandler(requestVerification));
router.get("/me", asyncHandler(protect), asyncHandler(me));

export default router;
