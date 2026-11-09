import { Booking } from "../models/Booking.js";
import {
  createBooking,
  cancelBooking,
  rescheduleBooking,
  buildMyBookingsQuery,
} from "../services/bookingService.js";

// POST /api/bookings — body validated by createBookingSchema
export async function create(req, res) {
  const { serviceId, startTime, notes } = req.body;
  const booking = await createBooking({ customerId: req.user._id, serviceId, startTime, notes });
  res.status(201).json({ data: booking });
}

// GET /api/bookings/mine?scope=upcoming|past
export async function listMine(req, res) {
  const { scope } = req.validatedQuery;
  const { filter, sort } = buildMyBookingsQuery(scope, new Date());

  // customer is set LAST so nothing in `filter` can ever show someone else's bookings
  const bookings = await Booking.find({ ...filter, customer: req.user._id })
    .sort(sort)
    .populate("service", "name durationMinutes");

  res.json({ data: bookings });
}

// PATCH /api/bookings/:id/cancel
export async function cancel(req, res) {
  const booking = await cancelBooking({ bookingId: req.params.id, customerId: req.user._id });
  res.json({ data: booking });
}

// PATCH /api/bookings/:id/reschedule — body validated by rescheduleBookingSchema
export async function reschedule(req, res) {
  const booking = await rescheduleBooking({
    bookingId: req.params.id,
    customerId: req.user._id,
    startTime: req.body.startTime,
  });
  res.json({ data: booking });
}
