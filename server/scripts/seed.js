// Resets the database to a known demo state.
// Usage: npm run seed            (development)
//        npm run seed -- --force (needed when NODE_ENV=production)
import mongoose from "mongoose";
import { env, isProduction } from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";
import { User } from "../src/models/User.js";
import { Service } from "../src/models/Service.js";
import { Settings } from "../src/models/Settings.js";
import { BlockedTime } from "../src/models/BlockedTime.js";

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
  ]);

  console.log("⚙️  Creating settings…");
  await Settings.create({
    businessName: "Fresh Fade Barbershop",
    phone: "+234 801 234 5678",
    address: "12 Admiralty Way, Lekki Phase 1, Lagos",
    // Everything else (hours, timezone, booking rules) uses the model defaults
  });

  console.log("👤 Creating users…");
  const [adminHash, customerHash] = await Promise.all([
    hashPassword(adminPassword),
    hashPassword(DEMO_CUSTOMER.password),
  ]);
  await User.create([
    { name: "Shop Owner", email: adminEmail, passwordHash: adminHash, role: "admin" },
    {
      name: "Demo Customer",
      email: DEMO_CUSTOMER.email,
      phone: "08012345678",
      passwordHash: customerHash,
    },
  ]);

  console.log("✂️  Creating services…");
  await Service.insertMany(SERVICES);

  console.log("\n✅ Seed complete");
  console.log(`   Admin:    ${adminEmail} (password from ADMIN_PASSWORD)`);
  console.log(`   Customer: ${DEMO_CUSTOMER.email} / ${DEMO_CUSTOMER.password}`);
  console.log(`   Services: ${SERVICES.length}`);
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
