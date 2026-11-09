import * as z from "zod";

// A MongoDB ObjectId: 24 hex characters. `label` is used in the error messages.
export function objectId(label = "id") {
  return z
    .string({ error: `${label} is required` })
    .regex(/^[a-f\d]{24}$/i, `${label} is not a valid id`);
}

// Must include a timezone: "2026-12-25T09:00:00Z" or "2026-12-25T09:00:00+01:00".
// A bare "2026-12-25T09:00" is rejected — we couldn't know which timezone was meant.
// Converted to a JS Date (which is always UTC inside).
export const isoDateTime = z.iso
  .datetime({
    offset: true,
    error: "Use an ISO date-time with a timezone, e.g. 2026-12-25T09:00:00+01:00",
  })
  .transform((value) => new Date(value));
