import api from "./client.js";

// startTime: the `start` value of a slot from getAvailableSlots()
export async function createBooking({ serviceId, startTime, notes }) {
  const response = await api.post("/bookings", { serviceId, startTime, notes: notes || undefined });
  return response.data.data;
}

// scope: "upcoming" | "past"
export async function getMyBookings(scope) {
  const response = await api.get("/bookings/mine", { params: { scope } });
  return response.data.data;
}

export async function getMyBooking(id) {
  const response = await api.get(`/bookings/${id}`);
  return response.data.data;
}

export async function cancelBooking(id) {
  const response = await api.patch(`/bookings/${id}/cancel`);
  return response.data.data;
}

export async function rescheduleBooking(id, startTime) {
  const response = await api.patch(`/bookings/${id}/reschedule`, { startTime });
  return response.data.data;
}
