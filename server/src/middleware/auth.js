import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";

// Lets the request through only if it carries a valid login cookie.
// Puts the logged-in user on req.user for the next handlers.
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return next(new AppError("Please log in to continue", 401));

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    // Expired, tampered with, or signed with another secret — all mean "not logged in"
    return next(new AppError("Your session has expired. Please log in again", 401));
  }

  // The token can outlive the user (e.g. account deleted), so check they still exist
  const user = await User.findById(payload.sub);
  if (!user) return next(new AppError("Please log in to continue", 401));

  req.user = user;
  next();
}

// Use AFTER requireAuth: router.get("/x", requireAuth, requireAdmin, handler)
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin") {
    return next(new AppError("You don't have permission to do that", 403));
  }
  next();
}
