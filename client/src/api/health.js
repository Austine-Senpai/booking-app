import api from "./client.js";

export async function getHealth() {
  const response = await api.get("/health");
  return response.data.data; // our API wraps every success in { data: ... }
}
