import dotenv from "dotenv";

// quiet: true stops dotenv printing a log line every time it loads .env
dotenv.config({ quiet: true });

const REQUIRED_VARS = ["MONGODB_URI", "JWT_SECRET", "CLIENT_URL"];

// Collect every missing variable so the developer can fix them all in one go,
// instead of discovering them one crash at a time.
const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

// Tests set their own values (in-memory DB etc.), so only exit outside of tests.
if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  console.error(
    `❌ Missing required environment variables: ${missing.join(", ")}\n` +
      "   Copy server/.env.example to server/.env and fill them in."
  );
  process.exit(1);
}

// One place to read config from. The rest of the app imports `env`
// instead of reading process.env directly.
export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN_DAYS: Number(process.env.JWT_EXPIRES_IN_DAYS) || 7,
  CLIENT_URL: process.env.CLIENT_URL,
  // Only used by scripts/seed.js, which checks them itself
  ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  // Email (all optional — see services/email.js for what happens without them)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@example.com",
});

export const isProduction = env.NODE_ENV === "production";
