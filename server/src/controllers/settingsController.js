import { getSettings, toPublicSettings } from "../services/settingsService.js";

// GET /api/settings — public business info, hours and booking rules
export async function getPublicSettings(_req, res) {
  const settings = await getSettings();
  res.json({ data: toPublicSettings(settings) });
}

// PUT /api/admin/settings — req.body is the full, validated settings object
export async function updateSettings(req, res) {
  const settings = await getSettings();
  settings.set(req.body);
  await settings.save();
  res.json({ data: settings });
}
