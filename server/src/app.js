import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env, isProduction } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";

// The app is built here but NOT started here (no app.listen).
// That lets tests import it and send requests with supertest.
const app = express();

// Hosts like Render put a proxy in front of the app. Without this, every request
// would appear to come from the proxy's IP — and the rate limiter would lock out
// ALL users together after 10 logins.
if (isProduction) app.set("trust proxy", 1);

app.use(helmet()); // sets safe HTTP headers
app.use(
  cors({
    origin: env.CLIENT_URL, // only our frontend may call the API
    credentials: true, // allow the auth cookie to be sent cross-origin
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ data: { status: "ok", time: new Date().toISOString() } });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/admin", adminRoutes); // requireAuth + requireAdmin applied inside
// Bookings router gets mounted here in Phase 4.

// These two must come LAST: anything not handled above is a 404,
// and any error thrown above ends up in errorHandler.
app.use(notFound);
app.use(errorHandler);

export default app;
