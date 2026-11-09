import { Router } from "express";
import { listActiveServices, getActiveService } from "../controllers/serviceController.js";

// Public — admin service routes live in adminRoutes.js
const router = Router();

router.get("/", listActiveServices);
router.get("/:id", getActiveService);

export default router;
