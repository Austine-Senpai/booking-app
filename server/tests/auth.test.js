import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";

const validUser = {
  name: "Ada Obi",
  email: "ada@example.com",
  password: "password123",
  phone: "08012345678",
};

// Fails the test if a password hash shows up anywhere in a response.
function expectNoPasswordLeak(res) {
  const body = JSON.stringify(res.body);
  expect(body).not.toContain("passwordHash");
  expect(body).not.toMatch(/\$2[aby]\$/); // every bcrypt hash starts with $2a$, $2b$ or $2y$
}

// Registers a user and returns an agent that keeps the login cookie,
// like a browser would.
async function registeredAgent(user = validUser) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user).expect(201);
  return agent;
}

describe("POST /api/auth/register", () => {
  it("creates a customer, sets an httpOnly cookie and hides the hash", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      name: "Ada Obi",
      email: "ada@example.com",
      role: "customer",
    });
    expect(res.headers["set-cookie"][0]).toMatch(/^token=.+HttpOnly/);
    expectNoPasswordLeak(res);

    // The password is stored hashed, never as plain text
    const saved = await User.findOne({ email: "ada@example.com" }).select("+passwordHash");
    expect(saved.passwordHash).not.toBe(validUser.password);
  });

  it("trims and lowercases the email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "  ADA@Example.COM " });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("ada@example.com");
  });

  it("ignores a role sent by the client (no self-promotion to admin)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, role: "admin" });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("customer");
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "ADA@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  it("returns 400 with field details for invalid input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password and sets a cookie", async () => {
    await registeredAgent();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("ada@example.com");
    expect(res.headers["set-cookie"][0]).toMatch(/^token=.+HttpOnly/);
    expectNoPasswordLeak(res);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    await registeredAgent();
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.message).toBe("Invalid email or password");
    expect(wrongPassword.headers["set-cookie"]).toBeUndefined();
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user when logged in", async () => {
    const agent = await registeredAgent();
    const res = await agent.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("ada@example.com");
    expectNoPasswordLeak(res);
  });

  it("returns 401 without a cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a forged token", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "token=not.a.real.token");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the cookie so /me stops working", async () => {
    const agent = await registeredAgent();
    await agent.post("/api/auth/logout").expect(200);

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
