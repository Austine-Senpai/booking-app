import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { setAuthCookie, clearAuthCookie } from "../utils/authCookie.js";
import { SALT_ROUNDS, hashPassword } from "../utils/password.js";

// POST /api/auth/register — req.body is already validated by registerSchema
export async function register(req, res) {
  const { name, email, password, phone } = req.body;

  const existing = await User.exists({ email });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, phone, passwordHash });

  setAuthCookie(res, user);
  res.status(201).json({ data: { user } }); // toJSON on the model strips passwordHash
}

// Created once when the server starts. Use the SAME cost (salt rounds) as register,
// so comparing against it takes as long as comparing against a real hash.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

// POST /api/auth/login — req.body is already validated by loginSchema
export async function login(req, res) {
  const { email, password } = req.body;

  // passwordHash has select:false, so we must ask for it explicitly.
  // (email is already trimmed + lowercased by loginSchema)
  const user = await User.findOne({ email }).select("+passwordHash");

  // Always run bcrypt, even with no user, so both failures take the same time
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !passwordOk) {
    throw new AppError("Invalid email or password", 401);
  }

  setAuthCookie(res, user);                    // ← same helper register uses
  res.json({ data: { user } }); // same shape as register; toJSON strips passwordHash
}

// POST /api/auth/logout
export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ data: { message: "Logged out" } });
}

// GET /api/auth/me — requireAuth has already loaded req.user
export function me(req, res) {
  res.json({ data: { user: req.user } });
}
