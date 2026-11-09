import { beforeAll, afterEach, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Each test file gets its own throwaway MongoDB in memory — tests never touch
// your real dev database, and they can run anywhere without MongoDB installed.
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Wait for every model's indexes (e.g. the unique booking index) to exist
  // before tests run — otherwise the first test could slip past them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

// Empty every collection between tests so they can't affect each other.
afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
