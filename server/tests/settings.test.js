import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { loginAs } from "./helpers.js";

// A complete, valid PUT body. Tests change one thing at a time.
function validSettings() {
  return {
    businessName: "Fresh Fade",
    phone: "+234 801 234 5678",
    address: "12 Admiralty Way, Lagos",
    timezone: "Africa/Lagos",
    currency: "NGN",
    workingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      dayOfWeek,
      isOpen: dayOfWeek !== 7,
      open: "09:00",
      close: "17:00",
    })),
    slotIntervalMinutes: 30,
    minNoticeHours: 2,
    bookingWindowDays: 30,
    cancellationNoticeHours: 12,
  };
}

describe("GET /api/settings", () => {
  it("creates defaults on first use and returns only public fields", async () => {
    const res = await request(app).get("/api/settings");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ timezone: "Africa/Lagos", currency: "NGN" });
    expect(res.body.data.workingHours).toHaveLength(7);
    expect(res.body.data).not.toHaveProperty("_id");
    expect(res.body.data).not.toHaveProperty("createdAt");
  });
});

describe("PUT /api/admin/settings", () => {
  it("saves valid settings, visible on the public route", async () => {
    const admin = await loginAs("admin");
    const res = await admin.put("/api/admin/settings").send(validSettings());

    expect(res.status).toBe(200);
    const publicRes = await request(app).get("/api/settings");
    expect(publicRes.body.data.businessName).toBe("Fresh Fade");
  });

  it("is admin-only", async () => {
    const customer = await loginAs("customer");
    expect((await customer.put("/api/admin/settings").send(validSettings())).status).toBe(403);
    expect((await request(app).put("/api/admin/settings").send(validSettings())).status).toBe(401);
  });

  it("rejects closing time before (or equal to) opening time on an open day", async () => {
    const admin = await loginAs("admin");
    const body = validSettings();
    body.workingHours[0] = { dayOfWeek: 1, isOpen: true, open: "17:00", close: "09:00" };

    const res = await admin.put("/api/admin/settings").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({
      field: "workingHours.0.close",
      message: "Closing time must be after opening time",
    });
  });

  it("ignores open/close order on a closed day", async () => {
    const admin = await loginAs("admin");
    const body = validSettings();
    body.workingHours[6] = { dayOfWeek: 7, isOpen: false, open: "17:00", close: "09:00" };

    expect((await admin.put("/api/admin/settings").send(body)).status).toBe(200);
  });

  it.each([
    ["time not in HH:mm", (b) => (b.workingHours[0].open = "9:00")],
    ["impossible time", (b) => (b.workingHours[0].close = "24:30")],
    ["only 6 days", (b) => b.workingHours.pop()],
    ["a day listed twice", (b) => (b.workingHours[6].dayOfWeek = 1)],
    ["unknown timezone", (b) => (b.timezone = "Mars/Olympus")],
    ["fractional interval", (b) => (b.slotIntervalMinutes = 7.5)],
    ["missing field", (b) => delete b.bookingWindowDays],
  ])("rejects %s with 400", async (_label, breakIt) => {
    const admin = await loginAs("admin");
    const body = validSettings();
    breakIt(body);

    const res = await admin.put("/api/admin/settings").send(body);
    expect(res.status).toBe(400);
  });
});
