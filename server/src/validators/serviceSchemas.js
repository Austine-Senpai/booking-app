import * as z from "zod";

const serviceFields = {
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z
    .number({ error: "Duration must be a number" })
    .int("Duration must be whole minutes")
    .min(5, "Duration must be at least 5 minutes")
    .max(480, "Duration can't be more than 8 hours"),
  // In kobo. The admin form converts naira → kobo before sending (Phase 8).
  price: z
    .number({ error: "Price must be a number" })
    .int("Price must be a whole number of kobo")
    .nonnegative("Price can't be negative"),
  isActive: z.boolean().optional(),
};

export const createServiceSchema = z.object(serviceFields);

// PATCH: any subset of the fields, but at least one — an empty update is a mistake.
export const updateServiceSchema = z
  .object(serviceFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, { error: "Send at least one field to update" });
