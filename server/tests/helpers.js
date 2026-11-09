import bcrypt from "bcryptjs";
import request from "supertest";
import { DateTime } from "luxon";
import app from "../src/app.js";
import { User } from "../src/models/User.js";

export const ZONE = "Africa/Lagos";

let counter = 0;

// Creates a user straight in the DB, logs them in, and returns a supertest
// agent that keeps the login cookie (like a browser would).
// The created user is available as agent.user (handy for agent.user._id).
// Usage: const admin = await loginAs("admin");  await admin.get("/api/admin/services")
export async function loginAs(role = "customer") {
  counter += 1;
  const email = `${role}${counter}@example.com`;
  const password = "password123";

  const user = await User.create({
    name: `Test ${role} ${counter}`,
    email,
    role,
    // Cost 4 (the minimum) instead of 12: tests don't need slow hashes, just valid ones
    passwordHash: await bcrypt.hash(password, 4),
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  agent.user = user;
  return agent;
}

// The endpoints use the real clock, so tests pick dates relative to today.
// The first Monday at least 2 days from now: open by default, inside the
// 30-day window, and far outside the 12-hour cancellation notice.
export function nextMonday() {
  let day = DateTime.now().setZone(ZONE).startOf("day").plus({ days: 2 });
  while (day.weekday !== 1) day = day.plus({ days: 1 });
  return day;
}

// A JS Date for a local Lagos time on a Luxon day: lagosAt(nextMonday(), "10:00")
export function lagosAt(day, time) {
  return DateTime.fromISO(`${day.toISODate()}T${time}`, { zone: ZONE }).toJSDate();
}
