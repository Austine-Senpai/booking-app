import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import app from "./app.js";

async function start() {
  try {
    // Connect first: there's no point accepting requests we can't serve.
    await connectDB(env.MONGODB_URI);
    app.listen(env.PORT, () => {
      console.log(`🚀 API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch {
    // connectDB already logged the reason.
    process.exit(1);
  }
}

start();
