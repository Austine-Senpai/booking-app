import api from "./client.js";

// Settings are needed almost everywhere (navbar, footer, page titles, booking
// pages) but rarely change, so they're fetched ONCE and shared. Every caller
// gets the same request/answer instead of firing its own.
let settingsPromise = null;

async function fetchSettings() {
  const response = await api.get("/settings");
  return response.data.data;
}

// Public business info: name, phone, address, timezone, hours, booking rules
export function getSettings() {
  if (!settingsPromise) {
    settingsPromise = fetchSettings();
    // If it fails, forget it so the next call tries again
    settingsPromise.catch(() => {
      settingsPromise = null;
    });
  }
  return settingsPromise;
}

// Called after the admin saves new settings, so the next getSettings() reloads
export function clearSettingsCache() {
  settingsPromise = null;
}
