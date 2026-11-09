// Business rules for creating and changing bookings. No req/res in here —
// controllers pass plain values in and get bookings (or an AppError) back.
import { DateTime } from "luxon";
import { Booking } from "../models/Booking.js";
import { Service } from "../models/Service.js";
import { getSettings } from "./settingsService.js";
import { getAvailableSlots } from "./availability.js";
import { AppError } from "../utils/AppError.js";

export const SLOT_TAKEN_MESSAGE = "Sorry, that time was just taken. Please pick another slot.";

// What the customer sees in their booking list / after booking
const SERVICE_FIELDS = "name durationMinutes";

// ---------- Helpers ----------

// Saves a booking, turning the database's "duplicate confirmed start time"
// error (from the unique index on Booking) into our friendly 409.
async function saveBooking(booking) {
  try {
    await booking.save();
  } catch (error) {
    if (error.code === 11000) throw new AppError(SLOT_TAKEN_MESSAGE, 409);
    throw error;
  }
}

// Throws 409 unless `startTime` is a free slot for `service` right now.
// Uses the SAME availability logic customers see, so the server never trusts
// the client. Returns the booking's end time.
async function assertSlotIsBookable({ service, startTime, settings, now, ignoreBookingId }) {
  // Which business day is this start time on? (e.g. 00:30 UTC is already the next day in Lagos)
  const date = DateTime.fromJSDate(startTime, { zone: settings.timezone }).toISODate();
  const slots = await getAvailableSlots(service._id, date, { now, ignoreBookingId });

  const wanted = startTime.toISOString(); // same format as slot.start
  if (!slots.some((slot) => slot.start === wanted)) {
    throw new AppError(SLOT_TAKEN_MESSAGE, 409);
  }

  const endTime = DateTime.fromJSDate(startTime).plus({ minutes: service.durationMinutes }).toJSDate();

  // One more overlap check right before saving, in case someone booked in the
  // last few milliseconds. (The unique index in saveBooking is the final guard.)
  const clashFilter = { status: "confirmed", startTime: { $lt: endTime }, endTime: { $gt: startTime } };
  if (ignoreBookingId) clashFilter._id = { $ne: ignoreBookingId };
  if (await Booking.exists(clashFilter)) throw new AppError(SLOT_TAKEN_MESSAGE, 409);

  return endTime;
}

// Customers may only touch their OWN bookings. Someone else's booking gives the
// same 404 as a missing one, so you can't discover which booking ids exist.
async function findOwnBooking(bookingId, customerId) {
  const booking = await Booking.findOne({ _id: bookingId, customer: customerId });
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
}

// Rules shared by cancel and reschedule.
// `action` is "cancelled" or "rescheduled", used in the messages.
function assertCustomerCanChange(booking, settings, now, action) {
  if (booking.status !== "confirmed") {
    throw new AppError(`Only confirmed bookings can be ${action}`, 400);
  }

  const deadline = DateTime.fromJSDate(booking.startTime).minus({
    hours: settings.cancellationNoticeHours,
  });
  // Same "at least N hours" reading as min notice: exactly at the deadline is still OK
  if (DateTime.fromJSDate(now) > deadline) {
    const contact = settings.phone ? ` Please call us on ${settings.phone}.` : "";
    throw new AppError(
      `Bookings can't be ${action} less than ${settings.cancellationNoticeHours} hours before the start time.${contact}`,
      400
    );
  }
}

// ---------- Customer actions ----------

export async function createBooking({ customerId, serviceId, startTime, notes, now = new Date() }) {
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) throw new AppError("Service not found", 404);

  const settings = await getSettings();
  const endTime = await assertSlotIsBookable({ service, startTime, settings, now });

  const booking = new Booking({
    customer: customerId,
    service: service._id,
    startTime,
    endTime,
    priceAtBooking: service.price, // copied, so later price changes don't affect it
    notes,
  });
  await saveBooking(booking);
  return booking.populate("service", SERVICE_FIELDS);
}

export async function cancelBooking({ bookingId, customerId, now = new Date() }) {
  const booking = await findOwnBooking(bookingId, customerId);
  const settings = await getSettings();
  assertCustomerCanChange(booking, settings, now, "cancelled");

  booking.status = "cancelled";
  booking.cancelledAt = now;
  booking.cancelledBy = "customer";
  await booking.save();
  return booking.populate("service", SERVICE_FIELDS);
}

export async function rescheduleBooking({ bookingId, customerId, startTime, now = new Date() }) {
  const booking = await findOwnBooking(bookingId, customerId);
  const settings = await getSettings();
  assertCustomerCanChange(booking, settings, now, "rescheduled");

  const service = await Service.findOne({ _id: booking.service, isActive: true });
  if (!service) {
    throw new AppError("This service is no longer offered, so the booking can't be moved. You can cancel it instead.", 400);
  }

  booking.endTime = await assertSlotIsBookable({
    service,
    startTime,
    settings,
    now,
    ignoreBookingId: booking._id,
  });
  booking.startTime = startTime;
  await saveBooking(booking);
  return booking.populate("service", SERVICE_FIELDS);
}

// Builds the database query for GET /api/bookings/mine.
//   scope → "upcoming" or "past"
//   now   → a JS Date
// Returns { filter, sort } — the controller adds `customer: <id>` to the filter.
//
// Fields you can use: startTime (Date), status ("confirmed" | "cancelled" | "completed" | "no_show")
// Mongo operators you'll likely want: { $gte: now }, { $lt: now }, $or: [ {...}, {...} ]
// Sort: { startTime: 1 } = soonest first, { startTime: -1 } = most recent first
//
// Decision: "Upcoming" = appointments that are still going to happen, i.e. the
// ones the customer can still act on (cancel/reschedule). A cancelled booking
// with a future date has nothing left to do, so it goes to "Past" with the
// rest of the history. The two tabs never overlap and together show everything.
export function buildMyBookingsQuery(scope, now) {
  if (scope === "upcoming") {
    return {
      filter: { status: "confirmed", startTime: { $gte: now } },
      sort: { startTime: 1 }, // soonest first
    };
  }

  // Past = everything that isn't upcoming: anything already started, plus
  // anything no longer confirmed (e.g. cancelled ahead of time)
  return {
    filter: { $or: [{ startTime: { $lt: now } }, { status: { $ne: "confirmed" } }] },
    sort: { startTime: -1 }, // most recent first
  };
}

// ---------- Admin actions ----------

export async function changeStatus({ bookingId, status, now = new Date() }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.status === status) return booking.populate("service", SERVICE_FIELDS);

  // You can't know someone didn't show up before the appointment has started
  if ((status === "completed" || status === "no_show") && booking.startTime > now) {
    throw new AppError("You can only mark a booking as completed or no-show once it has started", 400);
  }

  if (status === "confirmed") {
    // Re-confirming (e.g. undoing a cancel): the time may have been rebooked since.
    // Admin may override hours/notice rules, but never create a double booking.
    const clash = await Booking.exists({
      _id: { $ne: booking._id },
      status: "confirmed",
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
    });
    if (clash) throw new AppError("Can't re-confirm: another booking now has this time", 409);
    booking.cancelledAt = undefined;
    booking.cancelledBy = undefined;
  }

  if (status === "cancelled") {
    booking.cancelledAt = now;
    booking.cancelledBy = "admin";
  }

  booking.status = status;
  await saveBooking(booking);
  return booking.populate("service", SERVICE_FIELDS);
}

// Numbers for the admin dashboard, using the business's calendar (not UTC).
export async function getStats(now = new Date()) {
  const { timezone } = await getSettings();
  const local = DateTime.fromJSDate(now, { zone: timezone });

  const between = (start, end) => ({ $gte: start.toJSDate(), $lt: end.toJSDate() });
  const today = between(local.startOf("day"), local.startOf("day").plus({ days: 1 }));
  const thisWeek = between(local.startOf("week"), local.startOf("week").plus({ weeks: 1 })); // Monday–Sunday
  const notCancelled = { $ne: "cancelled" };

  const [todayCount, weekCount, upcomingCount, completedThisWeek] = await Promise.all([
    Booking.countDocuments({ startTime: today, status: notCancelled }),
    Booking.countDocuments({ startTime: thisWeek, status: notCancelled }),
    Booking.countDocuments({ startTime: { $gte: now }, status: "confirmed" }),
    Booking.find({ startTime: thisWeek, status: "completed" }).select("priceAtBooking"),
  ]);

  // Revenue counts only completed bookings — money actually earned (in kobo)
  const weekRevenue = completedThisWeek.reduce((sum, booking) => sum + booking.priceAtBooking, 0);

  return { todayCount, weekCount, weekRevenue, upcomingCount };
}
