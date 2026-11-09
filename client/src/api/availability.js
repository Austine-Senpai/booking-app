import api from "./client.js";

// Free slots for one service on one day.
// date: "YYYY-MM-DD" (a day in the business timezone)
// Returns [{ start, end, label }] — start/end are UTC ISO strings, label is "09:30"
export async function getAvailableSlots(serviceId, date) {
  const response = await api.get("/availability", { params: { serviceId, date } });
  return response.data.data.slots;
}
