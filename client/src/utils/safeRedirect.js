// The ?redirect= value comes from the URL, so anyone can put anything in it.
// Only allow paths on OUR site ("/my-bookings"), never another website
// ("https://evil.com" or "//evil.com"), so a crafted login link can't send a
// freshly logged-in user to a fake page.
export function safeRedirect(path, fallback = "/") {
  if (typeof path !== "string") return fallback;
  if (!path.startsWith("/")) return fallback; // absolute URLs like https://...
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback; // protocol-relative tricks
  return path;
}
