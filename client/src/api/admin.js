import api from "./client.js";

// Everything under /api/admin — the server only allows admins (403 otherwise).

// ---------- Dashboard ----------

// { todayCount, weekCount, weekRevenue (kobo), upcomingCount }
export async function getStats() {
  const response = await api.get("/admin/stats");
  return response.data.data;
}

// ---------- Bookings ----------

// filters: { date: "YYYY-MM-DD" (optional), status (optional), page }
// Returns { bookings, page, pageSize, total, totalPages }
export async function getAdminBookings({ date, status, page = 1 } = {}) {
  const response = await api.get("/admin/bookings", {
    params: { date: date || undefined, status: status || undefined, page },
  });
  return response.data.data;
}

// status: "confirmed" | "cancelled" | "completed" | "no_show"
export async function updateBookingStatus(id, status) {
  const response = await api.patch(`/admin/bookings/${id}/status`, { status });
  return response.data.data;
}

// ---------- Services ----------

// All services, including inactive ones
export async function getAdminServices() {
  const response = await api.get("/admin/services");
  return response.data.data;
}

// service: { name, description, durationMinutes, price (kobo), isActive }
export async function createService(service) {
  const response = await api.post("/admin/services", service);
  return response.data.data;
}

// changes: any subset of the fields above
export async function updateService(id, changes) {
  const response = await api.patch(`/admin/services/${id}`, changes);
  return response.data.data;
}

// ---------- Settings ----------

// The full settings object (PUT replaces everything, so send every field)
export async function updateSettings(settings) {
  const response = await api.put("/admin/settings", settings);
  return response.data.data;
}

// ---------- Blocked times ----------

// Without from/to: current and upcoming blocks
export async function getBlockedTimes() {
  const response = await api.get("/admin/blocked-times");
  return response.data.data;
}

// start/end: ISO date-times WITH a timezone offset, e.g. "2026-12-25T00:00:00+01:00"
export async function createBlockedTime({ start, end, reason }) {
  const response = await api.post("/admin/blocked-times", { start, end, reason: reason || undefined });
  return response.data.data;
}

export async function deleteBlockedTime(id) {
  await api.delete(`/admin/blocked-times/${id}`);
}
