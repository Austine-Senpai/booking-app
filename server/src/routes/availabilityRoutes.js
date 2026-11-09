import { Router } from "express";
import { getAvailability } from "../controllers/availabilityController.js";
import { validate } from "../middleware/validate.js";
import { availabilityQuerySchema } from "../validators/availabilitySchemas.js";

const router = Router();

router.get("/", validate(availabilityQuerySchema, "query"), getAvailability);

export default router;
