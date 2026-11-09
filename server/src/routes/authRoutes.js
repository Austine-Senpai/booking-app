import { Router } from "express";
import { register, login, logout, me } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { registerSchema, loginSchema } from "../validators/authSchemas.js";

const router = Router();

// Order matters: rate limit first (cheapest check), then validate, then the controller.
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
