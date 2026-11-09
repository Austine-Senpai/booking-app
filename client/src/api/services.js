import api from "./client.js";

// Active services, sorted by name
export async function getServices() {
  const response = await api.get("/services");
  return response.data.data;
}

// One active service (404 if missing or inactive)
export async function getService(id) {
  const response = await api.get(`/services/${id}`);
  return response.data.data;
}
