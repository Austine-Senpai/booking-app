import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    // Integer in kobo (₦5,000 → 500000). Never store money as a float.
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: "Price must be a whole number of kobo" },
    },
    // We never hard-delete services: old bookings still point at them.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Service = mongoose.model("Service", serviceSchema);
