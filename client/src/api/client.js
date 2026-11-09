import axios from "axios";

// The one axios instance the whole app uses.
// - In development VITE_API_URL is unset, so requests go to "/api" and Vite proxies them.
// - In production it's the deployed API's URL, e.g. https://my-api.onrender.com/api
// withCredentials sends the httpOnly auth cookie with every request.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export default api;
