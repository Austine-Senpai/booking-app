import { getAvailableSlots } from "../services/availability.js";
import { getSettings } from "../services/settingsService.js";

// GET /api/availability?serviceId=&date=
export async function getAvailability(req, res) {
  const { serviceId, date } = req.validatedQuery;
  const slots = await getAvailableSlots(serviceId, date);
  const { timezone } = await getSettings();

  res.json({ data: { date, timezone, slots } });
}
