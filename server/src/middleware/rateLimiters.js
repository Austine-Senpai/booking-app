import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// Slows down password guessing and fake sign-ups: 10 attempts per 15 min per IP.
// One shared limiter, so register + login attempts count towards the same total.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8", // tells clients how long to wait (RateLimit + Retry-After headers)
  legacyHeaders: false,
  message: { error: { message: "Too many attempts. Please try again in 15 minutes." } },
  // Tests make many auth requests in a row; they'd hit the limit otherwise.
  skip: () => env.NODE_ENV === "test",
});
