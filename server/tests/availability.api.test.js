// The /api/availability endpoint, with real (in-memory) DB data.
import { describe, it, expect } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import app from "../src/app.js";
import { Service } from "../src/models/Service.js";
import { Booking } from "../src/models/Booking.js";

const ZONE = "Africa/Lagos";

// The endpoint uses the real clock, so pick a date that is always valid:
// the first Monday at least 2 days from now (open by default, inside the 30-day window).
function nextMonday() {
  let day = DateTime.now().setZone(ZONE).startOf("day").plus({ days: 2 });
  while (day.weekday !== 1) day = day.plus({ days: 1 });
  return day;
}

async function createHaircut(extra = {}) {
  return Service.create({ name: "Haircut", durationMinutes: 30, price: 500000, ...extra });
}

describe("GET /api/availability", () => {
  it("returns the day's slots with the business timezone", async () => {
    const service = await createHaircut();
    const date = nextMonday().toISODate();

    const res = await request(app).get("/api/availability").query({ serviceId: String(service._id), date });

    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe(date);
    expect(res.body.data.timezone).toBe(ZONE);
    expect(res.body.data.slots).toHaveLength(16); // default hours 09:00–17:00
  });

  it("removes a slot taken by a confirmed booking, but not a cancelled one", async () => {
    const service = await createHaircut();
    const monday = nextMonday();
    const at = (time) => DateTime.fromISO(`${monday.toISODate()}T${time}`, { zone: ZONE }).toJSDate();
    const base = {
      customer: new mongoose.Types.ObjectId(),
      service: service._id,
      priceAtBooking: 500000,
    };
    await Booking.create([
      { ...base, startTime: at("10:00"), endTime: at("10:30") },
      { ...base, startTime: at("11:00"), endTime: at("11:30"), status: "cancelled" },
    ]);

    const res = await request(app)
      .get("/api/availability")
      .query({ serviceId: String(service._id), date: monday.toISODate() });

    const labels = res.body.data.slots.map((slot) => slot.label);
    expect(labels).not.toContain("10:00");
    expect(labels).toContain("11:00");
  });

  it("returns 400 for a missing or malformed query", async () => {
    const service = await createHaircut();

    const noDate = await request(app).get("/api/availability").query({ serviceId: String(service._id) });
    expect(noDate.status).toBe(400);
    expect(noDate.body.error.details[0].field).toBe("date");

    const badDate = await request(app)
      .get("/api/availability")
      .query({ serviceId: String(service._id), date: "07/01/2030" });
    expect(badDate.status).toBe(400);

    const badId = await request(app).get("/api/availability").query({ serviceId: "abc", date: "2030-01-07" });
    expect(badId.status).toBe(400);
  });

  it("returns 404 for an unknown or inactive service", async () => {
    const inactive = await createHaircut({ isActive: false });
    const date = nextMonday().toISODate();

    for (const serviceId of [String(inactive._id), "507f1f77bcf86cd799439011"]) {
      const res = await request(app).get("/api/availability").query({ serviceId, date });
      expect(res.status).toBe(404);
    }
  });
});
