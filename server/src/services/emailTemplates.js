// Booking email templates. Pure functions: data in → { subject, text, html } out.
// Every email has an HTML version (looks nice) and a plain-text version (for
// simple email apps, and it helps keep emails out of spam folders).
import { DateTime } from "luxon";
import { formatMoney } from "../utils/money.js";

// Customer-typed text (names, notes) goes into HTML. Escaping turns "<b>" into
// "&lt;b&gt;" so nobody can inject links or markup into our emails.
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// "Monday 7 January 2030 at 10:00" in the BUSINESS timezone
export function formatWhen(date, timezone) {
  return DateTime.fromJSDate(new Date(date), { zone: timezone }).toFormat("cccc d LLLL yyyy 'at' HH:mm");
}

// The booking facts every customer email shows, as [label, value] pairs
function bookingRows({ booking, service, settings }) {
  const rows = [
    ["Service", service.name],
    ["When", formatWhen(booking.startTime, settings.timezone)],
    ["Duration", `${service.durationMinutes} minutes`],
    ["Price", formatMoney(booking.priceAtBooking, settings.currency)],
  ];
  if (booking.notes) rows.push(["Your notes", booking.notes]);
  if (settings.address) rows.push(["Where", settings.address]);
  if (settings.phone) rows.push(["Phone", settings.phone]);
  return rows;
}

// Builds both versions of an email from the same pieces, so they never disagree.
function buildEmail({ subject, settings, greeting, intro, rows, closing, link }) {
  const text = [
    greeting,
    "",
    intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    ...(link ? [`${link.text}: ${link.url}`, ""] : []),
    closing,
    "",
    settings.businessName,
  ].join("\n");

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#0f172a">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const linkHtml = link
    ? `<p style="margin:24px 0"><a href="${escapeHtml(link.url)}" style="background:#0f172a;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(link.text)}</a></p>`
    : "";

  // Inline styles + tables: email apps ignore <style> blocks and modern CSS
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${escapeHtml(settings.businessName)}</h1>
      <p style="margin:0 0 8px">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px">${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse">${rowsHtml}</table>
      ${linkHtml}
      <p style="margin:16px 0 0;color:#475569">${escapeHtml(closing)}</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

function myBookingsLink(clientUrl) {
  return { text: "View my bookings", url: `${clientUrl}/my-bookings` };
}

const firstName = (customer) => customer.name.split(" ")[0];

// ---------- Customer emails ----------

export function bookingConfirmedEmail({ booking, customer, service, settings, clientUrl }) {
  return buildEmail({
    subject: `Booking confirmed: ${service.name}, ${formatWhen(booking.startTime, settings.timezone)}`,
    settings,
    greeting: `Hi ${firstName(customer)},`,
    intro: "Your booking is confirmed. Here are the details:",
    rows: bookingRows({ booking, service, settings }),
    link: myBookingsLink(clientUrl),
    closing: `Need to change it? You can cancel or reschedule up to ${settings.cancellationNoticeHours} hours before your appointment.`,
  });
}

export function bookingCancelledEmail({ booking, customer, service, settings, clientUrl }) {
  const byBusiness = booking.cancelledBy === "admin";
  return buildEmail({
    subject: `Booking cancelled: ${service.name}, ${formatWhen(booking.startTime, settings.timezone)}`,
    settings,
    greeting: `Hi ${firstName(customer)},`,
    intro: byBusiness
      ? "We're sorry — we've had to cancel your booking:"
      : "Your booking has been cancelled as requested:",
    rows: bookingRows({ booking, service, settings }),
    link: { text: "Book another time", url: `${clientUrl}/services` },
    closing: byBusiness
      ? `Please book another time that suits you${settings.phone ? `, or call us on ${settings.phone}` : ""}.`
      : "We hope to see you another time.",
  });
}

export function bookingRescheduledEmail({ booking, customer, service, settings, clientUrl, previousStartTime }) {
  const rows = bookingRows({ booking, service, settings });
  // Show the old time right after the new one, so the change is obvious
  rows.splice(2, 0, ["Was", formatWhen(previousStartTime, settings.timezone)]);

  return buildEmail({
    subject: `Booking moved: ${service.name}, now ${formatWhen(booking.startTime, settings.timezone)}`,
    settings,
    greeting: `Hi ${firstName(customer)},`,
    intro: "Your booking has been moved to a new time:",
    rows,
    link: myBookingsLink(clientUrl),
    closing: "See you then!",
  });
}

// ---------- Admin email ----------

export function adminNewBookingEmail({ booking, customer, service, settings, clientUrl }) {
  const rows = [
    ["Customer", customer.name],
    ["Email", customer.email],
    ...(customer.phone ? [["Phone", customer.phone]] : []),
    ["Service", service.name],
    ["When", formatWhen(booking.startTime, settings.timezone)],
    ["Price", formatMoney(booking.priceAtBooking, settings.currency)],
    ...(booking.notes ? [["Notes", booking.notes]] : []),
  ];

  return buildEmail({
    subject: `New booking: ${customer.name} — ${service.name}, ${formatWhen(booking.startTime, settings.timezone)}`,
    settings,
    greeting: "Hi,",
    intro: "A new booking has just been made:",
    rows,
    link: { text: "Open bookings", url: `${clientUrl}/admin/bookings` },
    closing: "This is an automatic notification.",
  });
}
