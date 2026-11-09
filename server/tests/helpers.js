import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";

let counter = 0;

// Creates a user straight in the DB, logs them in, and returns a supertest
// agent that keeps the login cookie (like a browser would).
// Usage: const admin = await loginAs("admin");  await admin.get("/api/admin/services")
export async function loginAs(role = "customer") {
  counter += 1;
  const email = `${role}${counter}@example.com`;
  const password = "password123";

  await User.create({
    name: `Test ${role}`,
    email,
    role,
    // Cost 4 (the minimum) instead of 12: tests don't need slow hashes, just valid ones
    passwordHash: await bcrypt.hash(password, 4),
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}
