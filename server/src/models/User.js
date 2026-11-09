import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    // select: false → never loaded unless a query asks for it with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  {
    timestamps: true,
    toJSON: {
      // Safety net: even if a query DID load passwordHash (e.g. during login),
      // it's removed whenever the user is turned into JSON for a response.
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Usage: const ok = await user.comparePassword("secret123")
// Only works on a user loaded with .select("+passwordHash").
userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
