import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { DateTime } from "luxon";
import app from "../src/app.js";
import { Service } from "../src/models/Service.js";
import { Booking } from "../src/models/Booking.js";
import { loginAs, nextMonday, lagosAt } from "./helpers.js";

const SLOT_TAKEN = "Sorry, that time was just taken. Please pick another slot.";

let haircut; // 30 min, ₦5,000
let retwist; // 90 min
let monday;

beforeEach(async () => {
  [haircut, retwist] = await Service.create([
    { name: "Haircut", durationMinutes: 30, price: 500000 },
    { name: "Dreadlocks retwist", durationMinutes: 90, price: 1500000 },
  ]);
  monday = nextMonday();
});

// POST /api/bookings as `agent` for a local Lagos time on Monday
function book(agent, time, service = haircut, extra = {}) {
  return agent.post("/api/bookings").send({
    serviceId: String(service._id),
    startTime: lagosAt(monday, time).toISOString(),
    ...extra,
  });
}

// Puts a booking straight into the DB (skipping the rules) — for past or
// soon-starting bookings that the API would correctly refuse to create.
function insertBooking(customer, startTime, status = "confirmed") {
  return Booking.create({
    customer: customer._id,
    service: haircut._id,
    startTime,
    endTime: DateTime.fromJSDate(startTime).plus({ minutes: 30 }).toJSDate(),
    priceAtBooking: 500000,
    status,
  });
}

describe("POST /api/bookings", () => {
  it("creates a booking: computes endTime and copies the price", async () => {
    const customer = await loginAs();
    const res = await book(customer, "10:00", haircut, { notes: "  Low fade please  " });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: "confirmed",
      startTime: lagosAt(monday, "10:00").toISOString(),
      endTime: lagosAt(monday, "10:30").toISOString(),
      priceAtBooking: 500000,
      notes: "Low fade please",
      service: { name: "Haircut", durationMinutes: 30 },
    });

    // A later price change doesn't touch the booking
    await Service.updateOne({ _id: haircut._id }, { price: 999900 });
    const saved = await Booking.findById(res.body.data._id);
    expect(saved.priceAtBooking).toBe(500000);
  });

  it("requires login", async () => {
    const res = await book(request(app), "10:00");
    expect(res.status).toBe(401);
  });

  it("refuses to book the same slot twice (409)", async () => {
    const first = await loginAs();
    const second = await loginAs();

    expect((await book(first, "10:00")).status).toBe(201);
    const res = await book(second, "10:00");

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(SLOT_TAKEN);
  });

  it("refuses a longer service that would run into an existing booking", async () => {
    const first = await loginAs();
    const second = await loginAs();
    await book(first, "10:00").expect(201);

    // 09:00 + 90 min = 10:30 → clashes with 10:00–10:30
    expect((await book(second, "09:00", retwist)).status).toBe(409);
  });

  it("only one of two simultaneous requests for the same slot succeeds", async () => {
    const [a, b] = await Promise.all([loginAs(), loginAs()]);

    const results = await Promise.all([book(a, "11:00"), book(b, "11:00")]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Booking.countDocuments({ status: "confirmed" })).toBe(1);
  });

  it("refuses times that aren't real slots: off-grid, closed day, past", async () => {
    const customer = await loginAs();
    const sunday = monday.minus({ days: 1 });
    // 14 days back, not 7: nextMonday() can be just 2 days away, so 7 days
    // back could be TODAY (still bookable) — two weeks back is always past.
    const twoWeeksAgo = monday.minus({ days: 14 });

    const attempts = [
      lagosAt(monday, "10:07"), // not on the 30-min grid
      lagosAt(sunday, "10:00"), // closed
      lagosAt(twoWeeksAgo, "10:00"), // past
    ];
    for (const startTime of attempts) {
      const res = await customer
        .post("/api/bookings")
        .send({ serviceId: String(haircut._id), startTime: startTime.toISOString() });
      expect(res.status, startTime.toISOString()).toBe(409);
    }
  });

  it("returns 404 for an inactive service and 400 for a bad body", async () => {
    const customer = await loginAs();
    await Service.updateOne({ _id: haircut._id }, { isActive: false });

    expect((await book(customer, "10:00")).status).toBe(404);
    expect((await customer.post("/api/bookings").send({ serviceId: "nope" })).status).toBe(400);
  });
});

describe("GET /api/bookings/mine", () => {
  it("splits bookings into upcoming (soonest first) and past (most recent first)", async () => {
    const customer = await loginAs();
    await book(customer, "11:00").expect(201);
    await book(customer, "10:00").expect(201);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    await insertBooking(customer.user, new Date(now - 2 * day), "completed");
    await insertBooking(customer.user, new Date(now - 1 * day), "completed");

    const upcoming = await customer.get("/api/bookings/mine?scope=upcoming");
    const past = await customer.get("/api/bookings/mine?scope=past");

    const startOf = (res) => res.body.data.map((b) => b.startTime);
    expect(startOf(upcoming)).toEqual([
      lagosAt(monday, "10:00").toISOString(),
      lagosAt(monday, "11:00").toISOString(),
    ]);
    expect(startOf(past)).toEqual([
      new Date(now - 1 * day).toISOString(),
      new Date(now - 2 * day).toISOString(),
    ]);
    expect(upcoming.body.data[0].service.name).toBe("Haircut");
  });

  it("puts a cancelled future booking in past, not upcoming", async () => {
    const customer = await loginAs();
    const created = await book(customer, "10:00").expect(201);
    await customer.patch(`/api/bookings/${created.body.data._id}/cancel`).expect(200);

    const upcoming = await customer.get("/api/bookings/mine?scope=upcoming");
    const past = await customer.get("/api/bookings/mine?scope=past");

    expect(upcoming.body.data).toEqual([]);
    expect(past.body.data.map((b) => b.status)).toEqual(["cancelled"]);
  });

  it("never shows another customer's bookings", async () => {
    const owner = await loginAs();
    const other = await loginAs();
    await book(owner, "10:00").expect(201);

    for (const scope of ["upcoming", "past"]) {
      const res = await other.get(`/api/bookings/mine?scope=${scope}`);
      expect(res.body.data).toEqual([]);
    }
  });
});

describe("PATCH /api/bookings/:id/cancel", () => {
  it("cancels the booking and frees the slot", async () => {
    const customer = await loginAs();
    const created = await book(customer, "10:00").expect(201);

    const res = await customer.patch(`/api/bookings/${created.body.data._id}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "cancelled", cancelledBy: "customer" });
    expect(res.body.data.cancelledAt).toBeTruthy();

    // Someone else can now book 10:00
    const another = await loginAs();
    expect((await book(another, "10:00")).status).toBe(201);
  });

  it("returns 404 for someone else's booking (and doesn't cancel it)", async () => {
    const owner = await loginAs();
    const stranger = await loginAs();
    const created = await book(owner, "10:00").expect(201);

    const res = await stranger.patch(`/api/bookings/${created.body.data._id}/cancel`);

    expect(res.status).toBe(404);
    expect((await Booking.findById(created.body.data._id)).status).toBe("confirmed");
  });

  it("refuses a late cancellation (inside the 12-hour notice) with 400", async () => {
    const customer = await loginAs();
    const soon = await insertBooking(customer.user, new Date(Date.now() + 3 * 60 * 60 * 1000));

    const res = await customer.patch(`/api/bookings/${soon._id}/cancel`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/less than 12 hours/);
  });

  it("refuses to cancel a booking that isn't confirmed", async () => {
    const customer = await loginAs();
    const created = await book(customer, "10:00").expect(201);
    const url = `/api/bookings/${created.body.data._id}/cancel`;

    await customer.patch(url).expect(200);
    expect((await customer.patch(url)).status).toBe(400);
  });
});

describe("PATCH /api/bookings/:id/reschedule", () => {
  it("moves the booking and frees the old slot", async () => {
    const customer = await loginAs();
    const created = await book(customer, "10:00").expect(201);

    const res = await customer
      .patch(`/api/bookings/${created.body.data._id}/reschedule`)
      .send({ startTime: lagosAt(monday, "14:00").toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.data.startTime).toBe(lagosAt(monday, "14:00").toISOString());
    expect(res.body.data.endTime).toBe(lagosAt(monday, "14:30").toISOString());

    const another = await loginAs();
    expect((await book(another, "10:00")).status).toBe(201);
  });

  it("can slide into a time that overlaps its OWN current slot", async () => {
    const customer = await loginAs();
    const created = await book(customer, "10:00", retwist).expect(201); // 10:00–11:30

    const res = await customer
      .patch(`/api/bookings/${created.body.data._id}/reschedule`)
      .send({ startTime: lagosAt(monday, "10:30").toISOString() }); // 10:30–12:00

    expect(res.status).toBe(200);
  });

  it("refuses a slot taken by someone else (409)", async () => {
    const mine = await loginAs();
    const theirs = await loginAs();
    const created = await book(mine, "10:00").expect(201);
    await book(theirs, "14:00").expect(201);

    const res = await mine
      .patch(`/api/bookings/${created.body.data._id}/reschedule`)
      .send({ startTime: lagosAt(monday, "14:00").toISOString() });

    expect(res.status).toBe(409);
  });

  it("follows the same ownership and notice rules as cancel", async () => {
    const owner = await loginAs();
    const stranger = await loginAs();
    const created = await book(owner, "10:00").expect(201);
    const soon = await insertBooking(owner.user, new Date(Date.now() + 3 * 60 * 60 * 1000));
    const body = { startTime: lagosAt(monday, "15:00").toISOString() };

    expect(
      (await stranger.patch(`/api/bookings/${created.body.data._id}/reschedule`).send(body)).status
    ).toBe(404);
    expect((await owner.patch(`/api/bookings/${soon._id}/reschedule`).send(body)).status).toBe(400);
  });
});
