import { DateTime } from "luxon";

// Can the customer still cancel or reschedule this booking online?
// Mirrors the server's rule (bookingService.js) so we can hide the buttons
// instead of letting people click and get an error. The server still checks.
export function canCustomerChange(booking, settings, now = new Date()) {
  if (booking.status !== "confirmed") return false;
  const deadline = DateTime.fromISO(booking.startTime).minus({ hours: settings.cancellationNoticeHours });
  return DateTime.fromJSDate(now) <= deadline;
}
