// Pure tests for the email templates and money formatting — no DB, no sending.
import { describe, it, expect } from "vitest";
import {
  bookingConfirmedEmail,
  bookingCancelledEmail,
  bookingRescheduledEmail,
  adminNewBookingEmail,
  escapeHtml,
} from "../src/services/emailTemplates.js";
import { formatMoney } from "../src/utils/money.js";

const settings = {
  businessName: "Fresh Fade Barbershop",
  address: "12 Admiralty Way, Lagos",
  phone: "+234 801 234 5678",
  timezone: "Africa/Lagos",
  currency: "NGN",
  cancellationNoticeHours: 12,
};
const customer = { name: "Ada Obi", email: "ada@example.com", phone: "08012345678" };
const service = { name: "Haircut", durationMinutes: 30 };
const booking = {
  startTime: new Date("2030-01-07T09:00:00Z"), // 10:00 in Lagos
  priceAtBooking: 500000,
  notes: "",
};
const base = { booking, customer, service, settings, clientUrl: "http://localhost:5173" };

describe("formatMoney", () => {
  it("formats kobo as naira, showing kobo only when there are some", () => {
    expect(formatMoney(500000)).toBe("₦5,000");
    expect(formatMoney(1500000)).toBe("₦15,000");
    expect(formatMoney(500050)).toBe("₦5,000.50");
    expect(formatMoney(0)).toBe("₦0");
  });
});

describe("bookingConfirmedEmail", () => {
  it("shows the details in the BUSINESS timezone, with price and address", () => {
    const email = bookingConfirmedEmail(base);

    expect(email.subject).toBe("Booking confirmed: Haircut, Monday 7 January 2030 at 10:00");
    for (const version of [email.text, email.html]) {
      expect(version).toContain("Fresh Fade Barbershop");
      expect(version).toContain("Monday 7 January 2030 at 10:00"); // 09:00 UTC → 10:00 Lagos
      expect(version).toContain("₦5,000");
      expect(version).toContain("12 Admiralty Way, Lagos");
      expect(version).toContain("http://localhost:5173/my-bookings");
    }
    expect(email.text).toContain("Hi Ada,");
  });

  it("escapes HTML typed by customers, but keeps it readable in plain text", () => {
    const email = bookingConfirmedEmail({
      ...base,
      customer: { ...customer, name: "<script>x</script> Obi" },
      booking: { ...booking, notes: 'Bring <a href="evil">this</a>' },
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain('<a href="evil">');
    expect(email.html).toContain("Bring &lt;a href=&quot;evil&quot;&gt;this&lt;/a&gt;");
    expect(email.text).toContain('Bring <a href="evil">this</a>'); // plain text can't run HTML
  });
});

describe("bookingCancelledEmail", () => {
  it("uses different wording when the business cancelled", () => {
    const byCustomer = bookingCancelledEmail({ ...base, booking: { ...booking, cancelledBy: "customer" } });
    const byAdmin = bookingCancelledEmail({ ...base, booking: { ...booking, cancelledBy: "admin" } });

    expect(byCustomer.text).toContain("cancelled as requested");
    expect(byAdmin.text).toContain("we've had to cancel");
    expect(byAdmin.text).toContain("+234 801 234 5678");
  });
});

describe("bookingRescheduledEmail", () => {
  it("shows both the new and the old time", () => {
    const email = bookingRescheduledEmail({
      ...base,
      previousStartTime: new Date("2030-01-06T13:00:00Z"), // Sunday 14:00 Lagos
    });

    expect(email.subject).toContain("now Monday 7 January 2030 at 10:00");
    expect(email.text).toContain("When: Monday 7 January 2030 at 10:00");
    expect(email.text).toContain("Was: Sunday 6 January 2030 at 14:00");
  });
});

describe("adminNewBookingEmail", () => {
  it("includes the customer's contact details", () => {
    const email = adminNewBookingEmail(base);

    expect(email.subject).toBe("New booking: Ada Obi — Haircut, Monday 7 January 2030 at 10:00");
    expect(email.text).toContain("Email: ada@example.com");
    expect(email.text).toContain("Phone: 08012345678");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;"
    );
  });
});
