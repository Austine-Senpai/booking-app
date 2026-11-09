import * as z from "zod";

// GET /api/availability?serviceId=...&date=YYYY-MM-DD
export const availabilityQuerySchema = z.object({
  // A MongoDB ObjectId is 24 hex characters
  serviceId: z
    .string({ error: "serviceId is required" })
    .regex(/^[a-f\d]{24}$/i, "serviceId is not a valid id"),
  date: z.iso.date({ error: "date must be in YYYY-MM-DD format" }),
});
