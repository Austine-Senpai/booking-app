// Booking actions trigger the right emails — and a broken mail server never
// breaks a booking. Uses a fake transporter instead of a real mail server.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Service } from "../src/models/Service.js";
import { setTransporterForTests } from "../src/services/email.js";
import { loginAs, nextMonday, lagosAt } from "./helpers.js";

let sent; // every email the fake transporter "sent"
let haircut;
let monday;

beforeEach(async () => {
  sent = [];
  setTransporterForTests({
    sendMail: async (message) => {
      sent.push(message);
      return { messageId: `fake-${sent.length}` };
    },
  });
  haircut = await Service.create({ name: "Haircut", durationMinutes: 30, price: 500000 });
  monday = nextMonday();
});

afterEach(() => {
  setTransporterForTests(null);
  vi.restoreAllMocks();
});

function book(agent, time) {
  return agent.post("/api/bookings").send({
    serviceId: String(haircut._id),
    startTime: lagosAt(monday, time).toISOString(),
  });
}

// Emails go out in the background, after the response — so wait for them
async function waitForEmails(count) {
  await vi.waitFor(() => expect(sent).toHaveLength(count));
}

describe("booking emails", () => {
  it("emails the customer and every admin when a booking is made", async () => {
    const admin = await loginAs("admin");
    const customer = await loginAs("customer");

    await book(customer, "10:00").expect(201);
    await waitForEmails(2);

    const toCustomer = sent.find((m) => m.to === customer.user.email);
    const toAdmins = sent.find((m) => Array.isArray(m.to));
    expect(toCustomer.subject).toMatch(/^Booking confirmed: Haircut/);
    expect(toCustomer.from).toEqual({ name: "My Business", address: "no-reply@example.com" });
    expect(toAdmins.to).toEqual([admin.user.email]);
    expect(toAdmins.subject).toMatch(/^New booking:/);
  });

  it("emails the customer on cancel and on reschedule (with the old time)", async () => {
    const customer = await loginAs("customer");
    const created = await book(customer, "10:00").expect(201);
    await waitForEmails(1); // no admins exist → only the customer email
    const id = created.body.data._id;

    await customer
      .patch(`/api/bookings/${id}/reschedule`)
      .send({ startTime: lagosAt(monday, "14:00").toISOString() })
      .expect(200);
    await waitForEmails(2);
    expect(sent[1].subject).toMatch(/^Booking moved: Haircut, now .* at 14:00$/);
    expect(sent[1].text).toMatch(/Was: .* at 10:00/);

    await customer.patch(`/api/bookings/${id}/cancel`).expect(200);
    await waitForEmails(3);
    expect(sent[2].subject).toMatch(/^Booking cancelled:/);
    expect(sent[2].text).toContain("cancelled as requested");
  });

  it("tells the customer when the ADMIN cancels", async () => {
    const admin = await loginAs("admin");
    const customer = await loginAs("customer");
    const created = await book(customer, "10:00").expect(201);
    await waitForEmails(2);

    await admin
      .patch(`/api/admin/bookings/${created.body.data._id}/status`)
      .send({ status: "cancelled" })
      .expect(200);
    await waitForEmails(3);

    expect(sent[2].to).toBe(customer.user.email);
    expect(sent[2].text).toContain("we've had to cancel");
  });

  it("still books successfully when the mail server is down", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    setTransporterForTests({
      sendMail: async () => {
        throw new Error("SMTP connection refused");
      },
    });
    const customer = await loginAs("customer");

    const res = await book(customer, "10:00");

    expect(res.status).toBe(201); // the booking doesn't care about email
    await vi.waitFor(() => expect(errorLog).toHaveBeenCalled());
    expect(errorLog.mock.calls[0].join(" ")).toContain("SMTP connection refused");
  });
});
