import { DateTime } from "luxon";
import { Booking } from "../models/Booking.js";
import { getSettings } from "../services/settingsService.js";
import { changeStatus, getStats } from "../services/bookingService.js";

const PAGE_SIZE = 20;

// GET /api/admin/bookings?date=YYYY-MM-DD&status=confirmed&page=2
export async function listBookings(req, res) {
  const { date, status, page } = req.validatedQuery;

  const filter = {};
  if (status) filter.status = status;
  if (date) {
    // "date" is a day in the BUSINESS timezone → its UTC start and end
    const { timezone } = await getSettings();
    const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf("day");
    filter.startTime = { $gte: dayStart.toJSDate(), $lt: dayStart.plus({ days: 1 }).toJSDate() };
  }

  const [total, bookings] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .sort({ startTime: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate("customer", "name email phone")
      .populate("service", "name durationMinutes"),
  ]);

  res.json({
    data: {
      bookings,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  });
}

// PATCH /api/admin/bookings/:id/status — body validated by bookingStatusSchema
export async function updateStatus(req, res) {
  const booking = await changeStatus({ bookingId: req.params.id, status: req.body.status });
  res.json({ data: booking });
}

// GET /api/admin/stats
export async function stats(_req, res) {
  res.json({ data: await getStats() });
}
