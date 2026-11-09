// The single source of truth for "which slots are free?".
// generateSlots() is PURE: no database, no clock — everything comes in as
// arguments — so it can be unit tested with any date and any "now".
import { DateTime } from "luxon";
import { Booking } from "../models/Booking.js";
import { BlockedTime } from "../models/BlockedTime.js";
import { Service } from "../models/Service.js";
import { getSettings } from "./settingsService.js";
import { AppError } from "../utils/AppError.js";

// Two time ranges overlap when each one starts before the other ends.
// Ranges that only touch (10:00–10:30 and 10:30–11:00) do NOT overlap,
// so back-to-back appointments are allowed.
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// "09:30" on a given day → Luxon DateTime at 09:30 in that day's timezone
function atTime(day, hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

// Decides if one candidate slot can be offered.
//   slot          → { start, end } as Luxon DateTimes
//   earliestStart → Luxon DateTime; slots starting before this are too soon (min notice)
//   busyRanges    → [{ start, end }] as Luxon DateTimes (confirmed bookings + blocked times)
// Returns true if the slot is free and far enough in the future.
//
// Luxon DateTimes compare with <, >, <=, >= just like numbers.
export function isSlotAvailable(slot, earliestStart, busyRanges) {
  // 5. Min notice: "2 hours' notice" means AT LEAST 2 hours, so a slot starting
  //    exactly at earliestStart is fine — only reject slots strictly before it.
  if (slot.start < earliestStart) return false;

  // 6. Reject the slot if it clashes with any booking or blocked time
  const clashes = busyRanges.some((busy) => overlaps(slot.start, slot.end, busy.start, busy.end));
  return !clashes;
}

// Returns the free slots for one service on one day:
//   [{ start: "2030-01-07T08:00:00.000Z", end: "...", label: "09:00" }]
// start/end are UTC (what the client sends back when booking);
// label is the local time in the business timezone (what the customer sees).
export function generateSlots({ date, service, settings, bookings = [], blockedTimes = [], now }) {
  const zone = settings.timezone;
  const duration = { minutes: service.durationMinutes };

  // 1. Read "YYYY-MM-DD" as midnight in the BUSINESS timezone (not the server's)
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid) return [];

  // 2. Not in the past, not beyond the booking window, not a closed day
  const nowInZone = DateTime.fromJSDate(now, { zone });
  const today = nowInZone.startOf("day");
  const lastBookableDay = today.plus({ days: settings.bookingWindowDays });
  if (day < today || day > lastBookableDay) return [];

  const hours = settings.workingHours.find((d) => d.dayOfWeek === day.weekday);
  if (!hours || !hours.isOpen) return [];

  // 3. That day's opening window
  const openAt = atTime(day, hours.open);
  const closeAt = atTime(day, hours.close);

  // 4. A candidate every slotIntervalMinutes, as long as the whole service fits before closing
  const candidates = [];
  for (
    let start = openAt;
    start.plus(duration) <= closeAt;
    start = start.plus({ minutes: settings.slotIntervalMinutes })
  ) {
    candidates.push({ start, end: start.plus(duration) });
  }

  // 5 + 6. Remove slots that are too soon or clash with something
  const earliestStart = nowInZone.plus({ hours: settings.minNoticeHours });
  const busyRanges = [
    // Defensive: the DB query already filters, but a cancelled booking must never block
    ...bookings
      .filter((booking) => booking.status === "confirmed")
      .map((booking) => ({ start: booking.startTime, end: booking.endTime })),
    ...blockedTimes.map((block) => ({ start: block.start, end: block.end })),
  ].map(({ start, end }) => ({
    start: DateTime.fromJSDate(new Date(start)),
    end: DateTime.fromJSDate(new Date(end)),
  }));

  return candidates
    .filter((slot) => isSlotAvailable(slot, earliestStart, busyRanges))
    .map((slot) => ({
      start: slot.start.toUTC().toISO(),
      end: slot.end.toUTC().toISO(),
      label: slot.start.toFormat("HH:mm"),
    }));
}

// Loads everything generateSlots needs from the database for one day.
// `now` is a parameter so tests (and Phase 4) can pass their own.
export async function getAvailableSlots(serviceId, date, now = new Date()) {
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) throw new AppError("Service not found", 404);

  const settings = await getSettings();

  // The business day, from local midnight to the next local midnight, in UTC
  const dayStart = DateTime.fromISO(date, { zone: settings.timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });

  // Anything overlapping the day — including a block that started yesterday
  const inThisDay = { $lt: dayEnd.toJSDate() };
  const [bookings, blockedTimes] = await Promise.all([
    Booking.find({ status: "confirmed", startTime: inThisDay, endTime: { $gt: dayStart.toJSDate() } }),
    BlockedTime.find({ start: inThisDay, end: { $gt: dayStart.toJSDate() } }),
  ]);

  return generateSlots({ date, service, settings, bookings, blockedTimes, now });
}
