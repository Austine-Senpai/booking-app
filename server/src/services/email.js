// Sending emails. Which "transporter" (delivery method) is used:
//   - SMTP_HOST set          → real SMTP server (e.g. Brevo, Mailgun, Gmail)
//   - development, no SMTP   → free Ethereal test inbox; the preview link is logged
//   - production, no SMTP    → emails are skipped, with one warning in the logs
//   - tests                  → nothing is sent, unless a test plugs in a fake
import nodemailer from "nodemailer";
import { env, isProduction } from "../config/env.js";
import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";
import { getSettings } from "./settingsService.js";
import {
  bookingConfirmedEmail,
  bookingCancelledEmail,
  bookingRescheduledEmail,
  adminNewBookingEmail,
} from "./emailTemplates.js";

// Created once, on the first email, then reused.
let transporterPromise = null;

async function createTransporter() {
  if (env.NODE_ENV === "test") return null; // tests must never send real email

  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true only for port 465; other ports upgrade to TLS automatically
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  if (isProduction) {
    console.warn("⚠️  SMTP_HOST is not set — booking emails are turned off.");
    return null;
  }

  // Development: a throwaway inbox at ethereal.email. Mail is caught there, never delivered.
  const account = await nodemailer.createTestAccount();
  console.log(`📧 No SMTP settings — using an Ethereal test inbox (${account.user})`);
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      transporterPromise = null; // e.g. offline: try again on the next email instead of giving up forever
      throw error;
    });
  }
  return transporterPromise;
}

// Tests pass a fake { sendMail() } object; null switches back to "send nothing".
export function setTransporterForTests(transporter) {
  transporterPromise = transporter ? Promise.resolve(transporter) : null;
}

// Sends one email. Throws if sending fails — callers decide how to handle it.
export async function sendEmail({ to, subject, text, html, fromName }) {
  const transporter = await getTransporter();
  if (!transporter) return null;

  const info = await transporter.sendMail({
    // Display name from settings, so the business name is never hardcoded
    from: { name: fromName, address: env.EMAIL_FROM },
    to,
    subject,
    text,
    html,
  });

  // Only Ethereal messages have a preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`📧 "${subject}"\n   Preview: ${previewUrl}`);
  return info;
}

const CUSTOMER_TEMPLATES = {
  confirmed: bookingConfirmedEmail,
  cancelled: bookingCancelledEmail,
  rescheduled: bookingRescheduledEmail,
};

async function sendBookingEmails(type, bookingId, extra) {
  // Skip the database work entirely when email is turned off
  if (!(await getTransporter())) return;

  const booking = await Booking.findById(bookingId)
    .populate("customer", "name email phone")
    .populate("service", "name durationMinutes");
  if (!booking) return;

  const settings = await getSettings();
  const data = {
    booking,
    customer: booking.customer,
    service: booking.service,
    settings,
    clientUrl: env.CLIENT_URL,
    ...extra,
  };
  const fromName = settings.businessName;

  const emails = [{ to: booking.customer.email, ...CUSTOMER_TEMPLATES[type](data) }];
  if (type === "confirmed") {
    const admins = await User.find({ role: "admin" }).select("email");
    if (admins.length > 0) {
      emails.push({ to: admins.map((admin) => admin.email), ...adminNewBookingEmail(data) });
    }
  }

  // allSettled: if the admin email fails, the customer's still goes (and vice versa)
  const results = await Promise.allSettled(emails.map((email) => sendEmail({ ...email, fromName })));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`📧 Could not send "${type}" email for booking ${bookingId}:`, result.reason.message);
    }
  }
}

// Emails about a booking event: "confirmed" | "cancelled" | "rescheduled".
// `extra` carries event details, e.g. { previousStartTime } for a reschedule.
//
// Deliberately NOT async: callers don't wait for it. The email is sent in the
// background, so a slow or broken mail server can never slow down or fail the
// customer's request. Every error is caught and logged here.
export function notifyBookingEvent(type, bookingId, extra = {}) {
  sendBookingEmails(type, bookingId, extra).catch((error) => {
    console.error(`📧 Could not send "${type}" email for booking ${bookingId}:`, error.message);
  });
}
