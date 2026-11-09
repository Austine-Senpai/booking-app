import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listAllServices,
  createService,
  updateService,
} from "../controllers/serviceController.js";
import { updateSettings } from "../controllers/settingsController.js";
import {
  listBlockedTimes,
  createBlockedTime,
  deleteBlockedTime,
} from "../controllers/blockedTimeController.js";
import { createServiceSchema, updateServiceSchema } from "../validators/serviceSchemas.js";
import { updateSettingsSchema } from "../validators/settingsSchemas.js";
import {
  createBlockedTimeSchema,
  listBlockedTimesSchema,
} from "../validators/blockedTimeSchemas.js";
import { listBookings, updateStatus, stats } from "../controllers/adminBookingController.js";
import { adminBookingsQuerySchema, bookingStatusSchema } from "../validators/bookingSchemas.js";

// Every route in this file is mounted at /api/admin.
// The guard is applied ONCE here, so a new admin route can't forget it.
const router = Router();
router.use(requireAuth, requireAdmin);

// Services
router.get("/services", listAllServices);
router.post("/services", validate(createServiceSchema), createService);
router.patch("/services/:id", validate(updateServiceSchema), updateService);

// Settings
router.put("/settings", validate(updateSettingsSchema), updateSettings);

// Blocked times
router.get("/blocked-times", validate(listBlockedTimesSchema, "query"), listBlockedTimes);
router.post("/blocked-times", validate(createBlockedTimeSchema), createBlockedTime);
router.delete("/blocked-times/:id", deleteBlockedTime);

// Bookings + dashboard
router.get("/bookings", validate(adminBookingsQuerySchema, "query"), listBookings);
router.patch("/bookings/:id/status", validate(bookingStatusSchema), updateStatus);
router.get("/stats", stats);

export default router;
