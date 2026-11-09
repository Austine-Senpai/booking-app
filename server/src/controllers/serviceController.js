import { Service } from "../models/Service.js";
import { AppError } from "../utils/AppError.js";

// Sort names alphabetically ignoring case ("beard trim" next to "Beard Trim")
const byName = { name: 1 };
const caseInsensitive = { locale: "en", strength: 2 };

// ---------- Public ----------

// GET /api/services — what customers can book
export async function listActiveServices(_req, res) {
  const services = await Service.find({ isActive: true }).sort(byName).collation(caseInsensitive);
  res.json({ data: services });
}

// GET /api/services/:id — an inactive service looks "not found" to customers
export async function getActiveService(req, res) {
  const service = await Service.findOne({ _id: req.params.id, isActive: true });
  if (!service) throw new AppError("Service not found", 404);
  res.json({ data: service });
}

// ---------- Admin ----------

// GET /api/admin/services — everything, active ones first
export async function listAllServices(_req, res) {
  const services = await Service.find()
    .sort({ isActive: -1, ...byName })
    .collation(caseInsensitive);
  res.json({ data: services });
}

// POST /api/admin/services
export async function createService(req, res) {
  const service = await Service.create(req.body);
  res.status(201).json({ data: service });
}

// PATCH /api/admin/services/:id — edit fields, or deactivate with { isActive: false }
export async function updateService(req, res) {
  const service = await Service.findById(req.params.id);
  if (!service) throw new AppError("Service not found", 404);

  // Load → change → save (instead of findByIdAndUpdate) so the model's
  // validators run exactly as they do on create.
  service.set(req.body);
  await service.save();
  res.json({ data: service });
}
