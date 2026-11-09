import mongoose from "mongoose";

// One entry per day. dayOfWeek follows Luxon: Monday = 1 … Sunday = 7.
// Times are "HH:mm" in the business timezone (not UTC).
const workingDaySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    isOpen: { type: Boolean, default: true },
    open: { type: String, default: "09:00" },
    close: { type: String, default: "17:00" },
  },
  { _id: false } // they're just values inside settings, no need for their own ids
);

// Mon–Sat 09:00–17:00, Sunday closed. The admin changes this in /admin/settings.
const DEFAULT_WORKING_HOURS = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: dayOfWeek !== 7,
  open: "09:00",
  close: "17:00",
}));

// There is only ever ONE settings document. Always read it with getSettings()
// from services/settingsService.js instead of querying this model directly.
const settingsSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true, default: "My Business" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    timezone: { type: String, default: "Africa/Lagos" },
    currency: { type: String, default: "NGN" },
    workingHours: { type: [workingDaySchema], default: DEFAULT_WORKING_HOURS },
    slotIntervalMinutes: { type: Number, default: 30 }, // how often a slot can start
    minNoticeHours: { type: Number, default: 2 }, // can't book closer to now than this
    bookingWindowDays: { type: Number, default: 30 }, // how far ahead customers can book
    cancellationNoticeHours: { type: Number, default: 12 }, // last moment to cancel/reschedule
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
