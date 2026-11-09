import api from "./client.js";

// Every function returns the user object ({ _id, name, email, phone, role })

export async function register({ name, email, password, phone }) {
  const response = await api.post("/auth/register", { name, email, password, phone: phone || undefined });
  return response.data.data.user;
}

export async function login({ email, password }) {
  const response = await api.post("/auth/login", { email, password });
  return response.data.data.user;
}

export async function logout() {
  await api.post("/auth/logout");
}

// Who is logged in? Throws (401) if nobody is.
export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data.data.user;
}
