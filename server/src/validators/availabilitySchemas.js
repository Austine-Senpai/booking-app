import * as z from "zod";
import { objectId } from "./common.js";

// GET /api/availability?serviceId=...&date=YYYY-MM-DD
export const availabilityQuerySchema = z.object({
  serviceId: objectId("serviceId"),
  date: z.iso.date({ error: "date must be in YYYY-MM-DD format" }),
});
