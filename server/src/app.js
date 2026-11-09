import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// The app is built here but NOT started here (no app.listen).
// That lets tests import it and send requests with supertest.
const app = express();

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

// Routers for auth, services, bookings… get mounted here in later phases.

// These two must come LAST: anything not handled above is a 404,
// and any error thrown above ends up in errorHandler.
app.use(notFound);
app.use(errorHandler);

export default app;
