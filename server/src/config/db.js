import mongoose from "mongoose";

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // Re-throw so the caller (server.js) decides what to do — e.g. exit the process.
    throw error;
  }
}
