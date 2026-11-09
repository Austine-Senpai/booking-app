import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { Service } from "../src/models/Service.js";
import { loginAs } from "./helpers.js";

const haircut = { name: "Haircut", durationMinutes: 30, price: 500000 };

describe("public service routes", () => {
  it("lists only active services, sorted by name (ignoring case)", async () => {
    await Service.create([
      { name: "kids cut", durationMinutes: 30, price: 350000 },
      { name: "Beard trim", durationMinutes: 15, price: 250000 },
      { name: "Old service", durationMinutes: 30, price: 100000, isActive: false },
      haircut,
    ]);

    const res = await request(app).get("/api/services");

    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.name)).toEqual(["Beard trim", "Haircut", "kids cut"]);
  });

  it("returns one active service", async () => {
    const service = await Service.create(haircut);
    const res = await request(app).get(`/api/services/${service._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Haircut");
  });

  it("returns 404 for an inactive, missing or malformed id", async () => {
    const inactive = await Service.create({ ...haircut, isActive: false });

    for (const id of [inactive._id, "507f1f77bcf86cd799439011", "not-an-id"]) {
      const res = await request(app).get(`/api/services/${id}`);
      expect(res.status, `id ${id}`).toBe(404);
    }
  });
});

describe("admin service routes — access control", () => {
  it("returns 401 when not logged in", async () => {
    const res = await request(app).get("/api/admin/services");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer, on read and write routes", async () => {
    const customer = await loginAs("customer");
    const service = await Service.create(haircut);

    expect((await customer.get("/api/admin/services")).status).toBe(403);
    expect((await customer.post("/api/admin/services").send(haircut)).status).toBe(403);
    expect(
      (await customer.patch(`/api/admin/services/${service._id}`).send({ isActive: false })).status
    ).toBe(403);
  });

  it("lets an admin see inactive services too", async () => {
    const admin = await loginAs("admin");
    await Service.create([haircut, { ...haircut, name: "Retired", isActive: false }]);

    const res = await admin.get("/api/admin/services");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("admin service routes — create and update", () => {
  it("creates a service", async () => {
    const admin = await loginAs("admin");
    const res = await admin.post("/api/admin/services").send(haircut);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ...haircut, isActive: true });
  });

  it("rejects a non-integer or negative price", async () => {
    const admin = await loginAs("admin");

    for (const price of [5000.5, -100, "5000"]) {
      const res = await admin.post("/api/admin/services").send({ ...haircut, price });
      expect(res.status, `price ${price}`).toBe(400);
      expect(res.body.error.details[0].field).toBe("price");
    }
  });

  it("deactivates a service, which hides it from customers", async () => {
    const admin = await loginAs("admin");
    const service = await Service.create(haircut);

    const res = await admin.patch(`/api/admin/services/${service._id}`).send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    expect((await request(app).get("/api/services")).body.data).toHaveLength(0);
  });

  it("rejects an empty update and returns 404 for an unknown id", async () => {
    const admin = await loginAs("admin");
    const service = await Service.create(haircut);

    expect((await admin.patch(`/api/admin/services/${service._id}`).send({})).status).toBe(400);
    expect(
      (await admin.patch("/api/admin/services/507f1f77bcf86cd799439011").send({ price: 1 })).status
    ).toBe(404);
  });
});
