import * as z from "zod";
import { isoDateTime as dateTime } from "./common.js";

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
