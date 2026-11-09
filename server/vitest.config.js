import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Set before any app code runs. dotenv never overwrites existing variables,
    // so these win over whatever is in server/.env.
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      CLIENT_URL: "http://localhost:5173",
      MONGODB_URI: "set-by-tests/setup.js", // the real URI comes from the in-memory server
    },
    setupFiles: ["./tests/setup.js"],
    // The first run downloads a MongoDB binary for mongodb-memory-server, which can be slow.
    hookTimeout: 120_000,
    // bcrypt with 12 rounds is deliberately slow; give each test some room.
    testTimeout: 20_000,
  },
});
