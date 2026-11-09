import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { DateTime } from "luxon";
import app from "../src/app.js";
import { Service } from "../src/models/Service.js";
import { Booking } from "../src/models/Booking.js";
import { loginAs, nextMonday, lagosAt, ZONE } from "./helpers.js";

let haircut;
let customer; // a User document
let monday;

beforeEach(async () => {
  haircut = await Service.create({ name: "Haircut", durationMinutes: 30, price: 500000 });
  customer = (await loginAs("customer")).user;
  monday = nextMonday();
});

function insertBooking(startTime, status = "confirmed") {
  return Booking.create({
    customer: customer._id,
    service: haircut._id,
    startTime,
    endTime: DateTime.fromJSDate(startTime).plus({ minutes: 30 }).toJSDate(),
    priceAtBooking: 500000,
    status,
  });
}

describe("admin booking routes — access", () => {
  it("are admin-only", async () => {
    const someCustomer = await loginAs("customer");
    for (const path of ["/api/admin/bookings", "/api/admin/stats"]) {
      expect((await request(app).get(path)).status).toBe(401);
      expect((await someCustomer.get(path)).status).toBe(403);
    }
  });
});

describe("GET /api/admin/bookings", () => {
  it("filters by business-timezone date and status, with customer + service details", async () => {
    const admin = await loginAs("admin");
    await insertBooking(lagosAt(monday, "09:00"));
    await insertBooking(lagosAt(monday, "10:00"), "cancelled");
    await insertBooking(lagosAt(monday.plus({ days: 1 }), "09:00"));
    // 00:30 Lagos time on Tuesday is 23:30 UTC on MONDAY — must count as Tuesday
    await insertBooking(lagosAt(monday.plus({ days: 1 }), "00:30"));

    const res = await admin.get("/api/admin/bookings").query({ date: monday.toISODate() });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.bookings[0].customer).toMatchObject({ name: customer.name, email: customer.email });
    expect(res.body.data.bookings[0].service.name).toBe("Haircut");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const cancelledOnly = await admin
      .get("/api/admin/bookings")
      .query({ date: monday.toISODate(), status: "cancelled" });
    expect(cancelledOnly.body.data.total).toBe(1);
  });

  it("paginates 20 per page", async () => {
    const admin = await loginAs("admin");
    const start = lagosAt(monday, "00:00");
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => insertBooking(new Date(start.getTime() + i * 30 * 60 * 1000)))
    );

    const page1 = await admin.get("/api/admin/bookings").query({ page: 1 });
    const page2 = await admin.get("/api/admin/bookings").query({ page: 2 });

    expect(page1.body.data.bookings).toHaveLength(20);
    expect(page2.body.data.bookings).toHaveLength(5);
    expect(page2.body.data).toMatchObject({ page: 2, total: 25, totalPages: 2 });
  });

  it("rejects a bad filter with 400", async () => {
    const admin = await loginAs("admin");
    expect((await admin.get("/api/admin/bookings").query({ status: "maybe" })).status).toBe(400);
    expect((await admin.get("/api/admin/bookings").query({ page: 0 })).status).toBe(400);
  });
});

describe("PATCH /api/admin/bookings/:id/status", () => {
  it("cancels a booking as admin", async () => {
    const admin = await loginAs("admin");
    const booking = await insertBooking(lagosAt(monday, "10:00"));

    const res = await admin.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "cancelled", cancelledBy: "admin" });
  });

  it("marks a past booking completed, but not a future one", async () => {
    const admin = await loginAs("admin");
    const past = await insertBooking(new Date(Date.now() - 60 * 60 * 1000));
    const future = await insertBooking(lagosAt(monday, "10:00"));

    const ok = await admin.patch(`/api/admin/bookings/${past._id}/status`).send({ status: "completed" });
    const tooEarly = await admin.patch(`/api/admin/bookings/${future._id}/status`).send({ status: "no_show" });

    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("completed");
    expect(tooEarly.status).toBe(400);
  });

  it("won't re-confirm a cancelled booking whose time was taken (409)", async () => {
    const admin = await loginAs("admin");
    const cancelled = await insertBooking(lagosAt(monday, "10:00"), "cancelled");
    await insertBooking(lagosAt(monday, "10:00")); // someone else took the slot

    const res = await admin.patch(`/api/admin/bookings/${cancelled._id}/status`).send({ status: "confirmed" });

    expect(res.status).toBe(409);
  });

  it("re-confirms a cancelled booking when the time is still free", async () => {
    const admin = await loginAs("admin");
    const cancelled = await insertBooking(lagosAt(monday, "10:00"), "cancelled");

    const res = await admin.patch(`/api/admin/bookings/${cancelled._id}/status`).send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("confirmed");
    expect(res.body.data.cancelledAt).toBeUndefined();
  });

  it("rejects an unknown status (400) and a missing booking (404)", async () => {
    const admin = await loginAs("admin");
    const booking = await insertBooking(lagosAt(monday, "10:00"));

    expect((await admin.patch(`/api/admin/bookings/${booking._id}/status`).send({ status: "done" })).status).toBe(400);
    expect(
      (await admin.patch("/api/admin/bookings/507f1f77bcf86cd799439011/status").send({ status: "cancelled" })).status
    ).toBe(404);
  });
});

describe("GET /api/admin/stats", () => {
  it("counts today's and upcoming bookings and this week's completed revenue", async () => {
    const admin = await loginAs("admin");
    const todayNoon = DateTime.now().setZone(ZONE).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });

    await insertBooking(todayNoon.toJSDate(), "completed"); // today + this week, ₦5,000 earned
    await insertBooking(todayNoon.plus({ hours: 1 }).toJSDate(), "cancelled"); // ignored everywhere
    await insertBooking(lagosAt(monday, "10:00")); // upcoming (next week)

    const res = await admin.get("/api/admin/stats");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      todayCount: 1,
      weekRevenue: 500000,
      upcomingCount: 1,
    });
    expect(res.body.data.weekCount).toBeGreaterThanOrEqual(1);
  });
});
