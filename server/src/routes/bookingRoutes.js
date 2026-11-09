import { Router } from "express";
import { create, listMine, getOne, cancel, reschedule } from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createBookingSchema,
  rescheduleBookingSchema,
  myBookingsQuerySchema,
} from "../validators/bookingSchemas.js";

// Every booking route needs a logged-in user. Ownership checks happen in
// bookingService, so a customer can only ever touch their own bookings.
const router = Router();
router.use(requireAuth);

router.post("/", validate(createBookingSchema), create);
router.get("/mine", validate(myBookingsQuerySchema, "query"), listMine);
// After "/mine" on purpose: otherwise "mine" would be treated as a booking id
router.get("/:id", getOne);
router.patch("/:id/cancel", cancel);
router.patch("/:id/reschedule", validate(rescheduleBookingSchema), reschedule);

export default router;
