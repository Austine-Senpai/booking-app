// Unit tests for the pure generateSlots() — no database or HTTP involved.
import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { generateSlots, overlaps } from "../src/services/availability.js";

const ZONE = "Africa/Lagos"; // UTC+1, no daylight saving

const settings = {
  timezone: ZONE,
  workingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: dayOfWeek !== 7, // Sunday closed
    open: "09:00",
    close: "17:00",
  })),
  slotIntervalMinutes: 30,
  minNoticeHours: 2,
  bookingWindowDays: 30,
};

// "Now" for most tests: Sunday 6 Jan 2030, 12:00 in Lagos.
// So Monday 7 Jan is tomorrow — min notice doesn't get in the way.
const SUNDAY_NOON = lagos("2030-01-06", "12:00");
const MONDAY = "2030-01-07";

// A Date for a local Lagos time, e.g. lagos("2030-01-07", "10:00")
function lagos(date, time) {
  return DateTime.fromISO(`${date}T${time}`, { zone: ZONE }).toJSDate();
}

// generateSlots with sensible defaults; each test overrides what it cares about
function slotsFor(overrides = {}) {
  return generateSlots({
    date: MONDAY,
    service: { durationMinutes: 30 },
    settings,
    bookings: [],
    blockedTimes: [],
    now: SUNDAY_NOON,
    ...overrides,
  });
}

const labels = (slots) => slots.map((slot) => slot.label);

function booking(start, end, status = "confirmed") {
  return { startTime: lagos(MONDAY, start), endTime: lagos(MONDAY, end), status };
}

describe("overlaps()", () => {
  it("detects overlap, but not ranges that only touch", () => {
    expect(overlaps(1, 3, 2, 4)).toBe(true); // partial
    expect(overlaps(1, 5, 2, 3)).toBe(true); // one inside the other
    expect(overlaps(1, 2, 2, 3)).toBe(false); // back-to-back
    expect(overlaps(1, 2, 3, 4)).toBe(false); // apart
  });
});

describe("generateSlots() — which days have slots", () => {
  it("returns [] on a closed day", () => {
    expect(slotsFor({ date: "2030-01-13" })).toEqual([]); // a Sunday
  });

  it("returns [] for a past date", () => {
    expect(slotsFor({ date: "2030-01-05" })).toEqual([]);
  });

  it("allows the last day of the booking window but not the day after", () => {
    // today (6 Jan) + 30 days = 5 Feb (a Tuesday)
    expect(slotsFor({ date: "2030-02-05" }).length).toBeGreaterThan(0);
    expect(slotsFor({ date: "2030-02-06" })).toEqual([]);
  });

  it("returns [] for an impossible date", () => {
    expect(slotsFor({ date: "2030-02-30" })).toEqual([]);
  });
});

describe("generateSlots() — building the slots", () => {
  it("30-min service, 09:00–17:00, 30-min interval → 16 slots from 09:00 to 16:30", () => {
    const slots = slotsFor();

    expect(slots).toHaveLength(16);
    expect(slots[0].label).toBe("09:00");
    expect(slots.at(-1).label).toBe("16:30");
  });

  it("90-min service never runs past closing", () => {
    const slots = slotsFor({ service: { durationMinutes: 90 } });

    expect(slots.at(-1).label).toBe("15:30"); // 15:30 + 90 min = 17:00 exactly
    expect(slots.at(-1).end).toBe(lagos(MONDAY, "17:00").toISOString());
    expect(labels(slots)).not.toContain("16:00");
  });

  it("uses Africa/Lagos time: 09:00 local = 08:00 UTC", () => {
    const [first] = slotsFor();

    expect(first.start).toBe("2030-01-07T08:00:00.000Z");
    expect(first.end).toBe("2030-01-07T08:30:00.000Z");
    expect(first.label).toBe("09:00");
  });
});

describe("generateSlots() — removing unavailable slots", () => {
  it("a 10:00–10:30 booking removes 10:00 for a 30-min service", () => {
    const slots = labels(slotsFor({ bookings: [booking("10:00", "10:30")] }));

    expect(slots).not.toContain("10:00");
    expect(slots).toContain("09:30");
    expect(slots).toContain("10:30");
  });

  it("…and removes 09:30 AND 10:00 for a 60-min service", () => {
    const slots = labels(
      slotsFor({ service: { durationMinutes: 60 }, bookings: [booking("10:00", "10:30")] })
    );

    expect(slots).not.toContain("09:30"); // 09:30–10:30 runs into the booking
    expect(slots).not.toContain("10:00");
    expect(slots).toContain("09:00"); // 09:00–10:00 ends just as the booking starts
    expect(slots).toContain("10:30");
  });

  it("allows a slot right after a booking ends (back-to-back)", () => {
    const slots = labels(slotsFor({ bookings: [booking("09:00", "10:00")] }));
    expect(slots[0]).toBe("10:00");
  });

  it("cancelled, completed and no-show bookings do NOT block slots", () => {
    const slots = slotsFor({
      bookings: [
        booking("10:00", "10:30", "cancelled"),
        booking("11:00", "11:30", "completed"),
        booking("12:00", "12:30", "no_show"),
      ],
    });
    expect(slots).toHaveLength(16);
  });

  it("blocked time 13:00–14:00 removes the overlapping slots", () => {
    const blockedTimes = [{ start: lagos(MONDAY, "13:00"), end: lagos(MONDAY, "14:00") }];

    const thirty = labels(slotsFor({ blockedTimes }));
    expect(thirty).not.toContain("13:00");
    expect(thirty).not.toContain("13:30");
    expect(thirty).toContain("12:30");
    expect(thirty).toContain("14:00");

    const sixty = labels(slotsFor({ blockedTimes, service: { durationMinutes: 60 } }));
    expect(sixty).not.toContain("12:30"); // 12:30–13:30 runs into the block
    expect(sixty).toContain("12:00");
  });

  it("a block that started the day before still blocks the morning", () => {
    const blockedTimes = [{ start: lagos("2030-01-06", "18:00"), end: lagos(MONDAY, "12:00") }];
    expect(slotsFor({ blockedTimes })[0].label).toBe("12:00");
  });

  it("min-notice rule removes slots too close to now", () => {
    // Monday 10:15 + 2 hours notice → nothing before 12:15
    const slots = slotsFor({ now: lagos(MONDAY, "10:15") });
    expect(slots[0].label).toBe("12:30");
  });

  it("offers a slot that starts exactly minNoticeHours from now", () => {
    // Monday 10:30 + 2 hours = 12:30 → exactly 2 hours' notice counts as "at least 2 hours"
    const slots = slotsFor({ now: lagos(MONDAY, "10:30") });
    expect(slots[0].label).toBe("12:30");
  });

  it("returns [] for today once every slot is too soon", () => {
    expect(slotsFor({ now: lagos(MONDAY, "16:00") })).toEqual([]);
  });
});
