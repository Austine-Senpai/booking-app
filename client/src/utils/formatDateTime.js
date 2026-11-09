import { DateTime } from "luxon";

// Times from the API are UTC ISO strings. Always show them in the BUSINESS
// timezone (from /api/settings), never the visitor's own timezone — a customer
// abroad booking a Lagos haircut needs to see Lagos time.
// This fallback matches the server's default, for the moment before settings load.
export const DEFAULT_TIMEZONE = "Africa/Lagos";

function inZone(value, timezone) {
  const iso = value instanceof Date ? value.toISOString() : value;
  return DateTime.fromISO(iso, { zone: timezone });
}

// "Mon 9 Nov 2026"
export function formatDate(value, timezone = DEFAULT_TIMEZONE) {
  return inZone(value, timezone).toFormat("ccc d LLL yyyy");
}

// "Monday 9 November 2026"
export function formatLongDate(value, timezone = DEFAULT_TIMEZONE) {
  return inZone(value, timezone).toFormat("cccc d LLLL yyyy");
}

// "10:00" (24-hour, matching the slot buttons)
export function formatTime(value, timezone = DEFAULT_TIMEZONE) {
  return inZone(value, timezone).toFormat("HH:mm");
}

// "Mon 9 Nov 2026, 10:00"
export function formatDateTime(value, timezone = DEFAULT_TIMEZONE) {
  return inZone(value, timezone).toFormat("ccc d LLL yyyy, HH:mm");
}
