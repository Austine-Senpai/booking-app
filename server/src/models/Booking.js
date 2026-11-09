import mongoose from "mongoose";

export const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    // Both UTC. endTime = startTime + service duration, saved so overlap
    // checks don't need to look up the service every time.
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value > this.startTime;
        },
        message: "End time must be after start time",
      },
    },
    // Only "confirmed" bookings block a slot.
    status: { type: String, enum: BOOKING_STATUSES, default: "confirmed" },
    // Kobo, copied from the service when booked — later price changes don't touch it.
    priceAtBooking: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["customer", "admin"] },
  },
  { timestamps: true }
);

// "Confirmed bookings on this day" — used by availability and the admin list
bookingSchema.index({ startTime: 1, status: 1 });
// "This customer's bookings, newest first" — used by My Bookings
bookingSchema.index({ customer: 1, startTime: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);
