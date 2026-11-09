import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";

export const AUTH_COOKIE_NAME = "token";

// Cookie options must be identical when setting and clearing, or the browser
// treats them as different cookies — so they're defined once here.
const cookieOptions = {
  httpOnly: true, // JavaScript in the browser can't read it → safe from XSS token theft
  // In production the client and API are on different domains, which requires
  // sameSite "none" + secure (HTTPS). Locally, Vite's proxy makes it same-site.
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d`,
  });

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000, // milliseconds; matches the token's expiry
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}
