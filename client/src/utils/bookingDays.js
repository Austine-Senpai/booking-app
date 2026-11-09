import { DateTime } from "luxon";

// The days a customer can pick from, starting today, in the BUSINESS timezone.
// Shows up to `count` days, but never beyond the booking window (the server
// would refuse those anyway). Closed days are included but marked, so the
// calendar keeps its shape and they can be shown disabled.
//
// Returns [{ date: "2026-11-12", weekday: "Thu", dayNumber: "12", month: "Nov",
//            longLabel: "Thursday 12 November", isOpen, isToday }]
export function getBookableDays(settings, count = 14) {
  const today = DateTime.now().setZone(settings.timezone).startOf("day");
  // Today + bookingWindowDays is the last bookable day, so the window holds bookingWindowDays + 1 days
  const total = Math.min(count, settings.bookingWindowDays + 1);

  return Array.from({ length: total }, (_, index) => {
    const day = today.plus({ days: index });
    const hours = settings.workingHours.find((h) => h.dayOfWeek === day.weekday);
    return {
      date: day.toISODate(),
      weekday: day.toFormat("ccc"),
      dayNumber: day.toFormat("d"),
      month: day.toFormat("LLL"),
      longLabel: day.toFormat("cccc d LLLL"),
      isOpen: Boolean(hours?.isOpen),
      isToday: index === 0,
    };
  });
}

// The first open day in the list, to pre-select it (saves the customer a tap)
export function firstOpenDay(days) {
  return days.find((day) => day.isOpen)?.date ?? null;
}
