import * as z from "zod";

// Trim + lowercase BEFORE checking the format, so " Ada@Example.com " is accepted
// and stored as "ada@example.com" (the same way the User model stores it).
const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(100),
  email,
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    // bcrypt silently ignores everything after 72 bytes, so longer passwords give a false sense of security
    .max(72, "Password must be at most 72 characters"),
  phone: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email,
  // No min(8) here: login only checks the password matches, not that it's strong
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});
