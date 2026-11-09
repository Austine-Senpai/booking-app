import mongoose from "mongoose";

// Time when nobody can book: holidays, lunch, personal time. Stored in UTC.
const blockedTimeSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value > this.start;
        },
        message: "End must be after start",
      },
    },
    reason: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// Availability asks "which blocks overlap this day?" → filter on start + end
blockedTimeSchema.index({ start: 1, end: 1 });

export const BlockedTime = mongoose.model("BlockedTime", blockedTimeSchema);
