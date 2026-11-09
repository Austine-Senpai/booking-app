import * as z from "zod";

// Must include a timezone: "2026-12-25T00:00:00Z" or "2026-12-25T00:00:00+01:00".
// A bare "2026-12-25T00:00" is rejected — we couldn't know which timezone was meant.
const dateTime = z.iso
  .datetime({ offset: true, error: "Use an ISO date-time with a timezone, e.g. 2026-12-25T09:00:00+01:00" })
  .transform((value) => new Date(value));

export const createBlockedTimeSchema = z
  .object({
    start: dateTime,
    end: dateTime,
    reason: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.end > data.start, {
    error: "End must be after start",
    path: ["end"],
  });

// GET /api/admin/blocked-times?from=&to= — both optional
export const listBlockedTimesSchema = z.object({
  from: dateTime.optional(),
  to: dateTime.optional(),
});
