import * as z from "zod";
import { objectId, isoDateTime } from "./common.js";
import { BOOKING_STATUSES } from "../models/Booking.js";

// POST /api/bookings
export const createBookingSchema = z.object({
  serviceId: objectId("serviceId"),
  startTime: isoDateTime, // one of the `start` values from /api/availability
  notes: z.string().trim().max(500, "Notes can be at most 500 characters").optional(),
});

// PATCH /api/bookings/:id/reschedule
export const rescheduleBookingSchema = z.object({
  startTime: isoDateTime,
});

// GET /api/bookings/mine?scope=upcoming|past
export const myBookingsQuerySchema = z.object({
  scope: z.enum(["upcoming", "past"]).default("upcoming"),
});

// GET /api/admin/bookings?date=&status=&page=
export const adminBookingsQuerySchema = z.object({
  date: z.iso.date({ error: "date must be in YYYY-MM-DD format" }).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  // Query strings are always text ("2"), so coerce turns them into numbers
  page: z.coerce.number().int().min(1).default(1),
});

// PATCH /api/admin/bookings/:id/status
export const bookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});
