import bcrypt from "bcryptjs";

// Cost factor for bcrypt: each +1 doubles the hashing time. 12 is a common
// default — slow enough to make guessing expensive, fast enough for a login.
// Shared by registration and the seed script so every hash is made the same way.
export const SALT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}
