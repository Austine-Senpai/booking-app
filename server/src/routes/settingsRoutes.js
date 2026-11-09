import { Router } from "express";
import { getPublicSettings } from "../controllers/settingsController.js";

// Public — updating settings is in adminRoutes.js
const router = Router();

router.get("/", getPublicSettings);

export default router;
