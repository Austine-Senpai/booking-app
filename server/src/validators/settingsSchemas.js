import * as z from "zod";
import { IANAZone } from "luxon";

// "09:00", "17:30" — 24-hour clock, always two digits each side.
// Because the format is fixed, comparing the strings ("17:00" > "09:00")
// gives the same answer as comparing the times.
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour "HH:mm" format, e.g. "09:00"');

const workingDay = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7), // Monday = 1 … Sunday = 7 (Luxon style)
    isOpen: z.boolean(),
    open: time,
    close: time,
  })
  // Only matters on open days; a closed day's times are ignored.
  .refine((day) => !day.isOpen || day.close > day.open, {
    error: "Closing time must be after opening time",
    path: ["close"],
  });

const wholeNumber = (min, max) => z.number().int().min(min).max(max);

// PUT replaces all settings, so every field is required.
export const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(100),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(200),
  timezone: z.string().refine((zone) => IANAZone.isValidZone(zone), {
    error: 'Unknown timezone (use a name like "Africa/Lagos")',
  }),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code like "NGN"'),
  workingHours: z
    .array(workingDay)
    .length(7, "Working hours must include all 7 days")
    .refine((days) => new Set(days.map((day) => day.dayOfWeek)).size === 7, {
      error: "Each day of the week must appear exactly once",
    }),
  slotIntervalMinutes: wholeNumber(5, 240),
  minNoticeHours: wholeNumber(0, 168),
  bookingWindowDays: wholeNumber(1, 365),
  cancellationNoticeHours: wholeNumber(0, 168),
});
