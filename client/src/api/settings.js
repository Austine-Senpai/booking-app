import api from "./client.js";

// Public business info: name, phone, address, timezone, hours, booking rules
export async function getSettings() {
  const response = await api.get("/settings");
  return response.data.data;
}
