import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { BlockedTime } from "../src/models/BlockedTime.js";
import { loginAs } from "./helpers.js";

describe("admin blocked times", () => {
  it("is admin-only", async () => {
    const customer = await loginAs("customer");
    expect((await customer.get("/api/admin/blocked-times")).status).toBe(403);
    expect((await request(app).get("/api/admin/blocked-times")).status).toBe(401);
  });

  it("creates a block, converting an offset time to UTC", async () => {
    const admin = await loginAs("admin");
    const res = await admin.post("/api/admin/blocked-times").send({
      start: "2030-12-25T09:00:00+01:00", // 09:00 in Lagos
      end: "2030-12-25T17:00:00+01:00",
      reason: "Christmas",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.start).toBe("2030-12-25T08:00:00.000Z"); // = 08:00 UTC
  });

  it("rejects end before start, and times without a timezone", async () => {
    const admin = await loginAs("admin");

    const backwards = await admin.post("/api/admin/blocked-times").send({
      start: "2030-12-25T17:00:00Z",
      end: "2030-12-25T09:00:00Z",
    });
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.details[0].field).toBe("end");

    const noZone = await admin.post("/api/admin/blocked-times").send({
      start: "2030-12-25T09:00:00",
      end: "2030-12-25T17:00:00",
    });
    expect(noZone.status).toBe(400);
  });

  it("lists blocks that overlap the range, oldest first", async () => {
    const admin = await loginAs("admin");
    await BlockedTime.create([
      { start: "2030-01-01T10:00:00Z", end: "2030-01-01T11:00:00Z", reason: "inside" },
      { start: "2029-12-31T20:00:00Z", end: "2030-01-01T09:00:00Z", reason: "starts before" },
      { start: "2030-01-02T10:00:00Z", end: "2030-01-02T11:00:00Z", reason: "next day" },
    ]);

    const res = await admin
      .get("/api/admin/blocked-times")
      .query({ from: "2030-01-01T00:00:00Z", to: "2030-01-02T00:00:00Z" });

    expect(res.status).toBe(200);
    expect(res.body.data.map((b) => b.reason)).toEqual(["starts before", "inside"]);
  });

  it("hides past blocks when no range is given", async () => {
    const admin = await loginAs("admin");
    await BlockedTime.create([
      { start: "2020-01-01T10:00:00Z", end: "2020-01-01T11:00:00Z", reason: "past" },
      { start: "2030-01-01T10:00:00Z", end: "2030-01-01T11:00:00Z", reason: "future" },
    ]);

    const res = await admin.get("/api/admin/blocked-times");
    expect(res.body.data.map((b) => b.reason)).toEqual(["future"]);
  });

  it("deletes a block, then 404s on a second delete", async () => {
    const admin = await loginAs("admin");
    const block = await BlockedTime.create({
      start: "2030-01-01T10:00:00Z",
      end: "2030-01-01T11:00:00Z",
    });

    expect((await admin.delete(`/api/admin/blocked-times/${block._id}`)).status).toBe(204);
    expect((await admin.delete(`/api/admin/blocked-times/${block._id}`)).status).toBe(404);
  });
});
