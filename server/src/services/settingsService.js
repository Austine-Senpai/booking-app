import { Settings } from "../models/Settings.js";

// Returns THE settings document, creating it with the model's defaults the first
// time. Every part of the app reads settings through this one function.
export async function getSettings() {
  const existing = await Settings.findOne();
  if (existing) return existing;
  return Settings.create({});
}

// Fields anyone may see (shown on the site and used by the booking page).
// Listed explicitly — rather than "everything except X" — so that a private
// field added to Settings later can never leak by accident.
export function toPublicSettings(settings) {
  return {
    businessName: settings.businessName,
    phone: settings.phone,
    address: settings.address,
    timezone: settings.timezone,
    currency: settings.currency,
    workingHours: settings.workingHours.map(({ dayOfWeek, isOpen, open, close }) => ({
      dayOfWeek,
      isOpen,
      open,
      close,
    })),
    slotIntervalMinutes: settings.slotIntervalMinutes,
    minNoticeHours: settings.minNoticeHours,
    bookingWindowDays: settings.bookingWindowDays,
    cancellationNoticeHours: settings.cancellationNoticeHours,
  };
}
