// Resets the database to a known demo state.
// Usage: npm run seed            (development)
//        npm run seed -- --force (needed when NODE_ENV=production)
import crypto from "node:crypto";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { env, isProduction } from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";
import { User } from "../src/models/User.js";
import { Service } from "../src/models/Service.js";
import { Settings } from "../src/models/Settings.js";
import { BlockedTime } from "../src/models/BlockedTime.js";
import { Booking } from "../src/models/Booking.js";

const DEMO_CUSTOMER = { email: "demo@example.com", password: "demo1234" };

// ₦ amounts × 100 = kobo
const SERVICES = [
  {
    name: "Haircut",
    description: "Classic cut with clippers and scissors, finished with a hot towel.",
    durationMinutes: 30,
    price: 5000_00,
  },
  {
    name: "Beard trim",
    description: "Shape-up and line-up for your beard, with beard oil.",
    durationMinutes: 15,
    price: 2500_00,
  },
  {
    name: "Haircut + Beard",
    description: "Our full grooming package: haircut and beard trim together.",
    durationMinutes: 45,
    price: 7000_00,
  },
  {
    name: "Kids cut",
    description: "Haircut for children under 12. Patient barbers, no tears.",
    durationMinutes: 30,
    price: 3500_00,
  },
  {
    name: "Dreadlocks retwist",
    description: "Retwist and style for existing locs, includes wash.",
    durationMinutes: 90,
    price: 15000_00,
  },
];

// Other customers, so the admin pages show a realistic mix of names.
// They get random passwords — nobody logs in as them.
const OTHER_CUSTOMERS = [
  { key: "chidi", name: "Chidi Okafor", email: "chidi@example.com", phone: "08031234567" },
  { key: "amaka", name: "Amaka Nwosu", email: "amaka@example.com", phone: "08059876543" },
];

// Demo bookings relative to TODAY, so the demo always has a recent past, a busy
// today and a near future, whatever day it's seeded.
// [days from today, local time, service name, status, customer]
// "auto" = completed if that time has already passed, otherwise confirmed.
const DEMO_BOOKINGS = [
  [-3, "10:00", "Haircut", "completed", "demo"],
  [-3, "14:00", "Haircut + Beard", "completed", "demo"],
  [-2, "11:00", "Beard trim", "no_show", "demo"],
  [-2, "16:00", "Kids cut", "completed", "amaka"],
  [-1, "09:00", "Dreadlocks retwist", "completed", "demo"],
  [-1, "15:00", "Kids cut", "cancelled", "demo"],
  [0, "09:00", "Haircut", "auto", "chidi"],
  [0, "11:30", "Haircut + Beard", "auto", "amaka"],
  [0, "16:00", "Beard trim", "auto", "chidi"],
  [1, "10:00", "Haircut", "confirmed", "demo"],
  [1, "14:30", "Dreadlocks retwist", "confirmed", "amaka"],
  [2, "13:00", "Haircut + Beard", "confirmed", "demo"],
  [3, "09:30", "Dreadlocks retwist", "confirmed", "demo"],
];

// Builds the booking documents. Bookings that would land on a Sunday (closed)
// move one more day away from today.
function buildDemoBookings({ customersByKey, services, timezone }) {
  const now = DateTime.now().setZone(timezone);
  const today = now.startOf("day");

  return DEMO_BOOKINGS.map(([daysFromToday, time, serviceName, plannedStatus, customerKey]) => {
    let day = today.plus({ days: daysFromToday });
    if (day.weekday === 7) day = day.plus({ days: daysFromToday < 0 ? -1 : 1 });

    const service = services.find((s) => s.name === serviceName);
    const start = DateTime.fromISO(`${day.toISODate()}T${time}`, { zone: timezone });
    const status = plannedStatus === "auto" ? (start < now ? "completed" : "confirmed") : plannedStatus;
    return {
      customer: customersByKey[customerKey]._id,
      service: service._id,
      startTime: start.toJSDate(),
      endTime: start.plus({ minutes: service.durationMinutes }).toJSDate(),
      status,
      priceAtBooking: service.price,
      notes: serviceName === "Haircut" && status === "confirmed" ? "Low fade, please." : "",
      ...(status === "cancelled" && { cancelledAt: start.minus({ days: 1 }).toJSDate(), cancelledBy: "customer" }),
    };
  });
}

async function seed() {
  // Wiping a live database by accident would be a disaster — make it deliberate.
  if (isProduction && !process.argv.includes("--force")) {
    console.error("❌ Refusing to seed: NODE_ENV is production. Re-run with --force if you really mean it.");
    process.exit(1);
  }

  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 8) {
    console.error("❌ Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in server/.env first.");
    process.exit(1);
  }

  await connectDB(env.MONGODB_URI);

  console.log("🧹 Clearing collections…");
  await Promise.all([
    User.deleteMany({}),
    Service.deleteMany({}),
    Settings.deleteMany({}),
    BlockedTime.deleteMany({}),
    Booking.deleteMany({}),
  ]);

  console.log("⚙️  Creating settings…");
  const settings = await Settings.create({
    businessName: "Fresh Fade Barbershop",
    phone: "+234 801 234 5678",
    address: "12 Admiralty Way, Lekki Phase 1, Lagos",
    // Everything else (hours, timezone, booking rules) uses the model defaults
  });

  console.log("👤 Creating users…");
  const [adminHash, customerHash, randomHash] = await Promise.all([
    hashPassword(adminPassword),
    hashPassword(DEMO_CUSTOMER.password),
    hashPassword(crypto.randomUUID()), // for the extra customers nobody logs in as
  ]);
  const [, demoCustomer, ...others] = await User.create([
    { name: "Shop Owner", email: adminEmail, passwordHash: adminHash, role: "admin" },
    {
      name: "Demo Customer",
      email: DEMO_CUSTOMER.email,
      phone: "08012345678",
      passwordHash: customerHash,
    },
    ...OTHER_CUSTOMERS.map(({ name, email, phone }) => ({ name, email, phone, passwordHash: randomHash })),
  ]);
  const customersByKey = { demo: demoCustomer };
  OTHER_CUSTOMERS.forEach((customer, index) => (customersByKey[customer.key] = others[index]));

  console.log("✂️  Creating services…");
  const services = await Service.insertMany(SERVICES);

  console.log("📅 Creating demo bookings…");
  // The unique "one confirmed booking per start time" index must exist before
  // inserting, so the seed data obeys the same rule as real bookings.
  await Booking.init();
  await Booking.insertMany(buildDemoBookings({ customersByKey, services, timezone: settings.timezone }));

  console.log("\n✅ Seed complete");
  console.log(`   Admin:    ${adminEmail} (password from ADMIN_PASSWORD)`);
  console.log(`   Customer: ${DEMO_CUSTOMER.email} / ${DEMO_CUSTOMER.password}`);
  console.log(`   Services: ${SERVICES.length}`);
  console.log(`   Bookings: ${DEMO_BOOKINGS.length} (past, today and upcoming)`);
}

try {
  await seed();
} catch (error) {
  console.error("❌ Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  // Close the connection so the script ends instead of hanging
  await mongoose.disconnect();
}
