import { BlockedTime } from "../models/BlockedTime.js";
import { AppError } from "../utils/AppError.js";

// GET /api/admin/blocked-times?from=&to=
// Returns blocks that OVERLAP the range (not just ones starting inside it),
// so a holiday that began yesterday still shows up today.
// Without `from`, it defaults to now → "current and upcoming" blocks.
export async function listBlockedTimes(req, res) {
  const { from = new Date(), to } = req.validatedQuery;

  // Overlap rule from CLAUDE.md: aStart < bEnd && bStart < aEnd
  const filter = { end: { $gt: from } };
  if (to) filter.start = { $lt: to };

  const blockedTimes = await BlockedTime.find(filter).sort({ start: 1 });
  res.json({ data: blockedTimes });
}

// POST /api/admin/blocked-times
export async function createBlockedTime(req, res) {
  const blockedTime = await BlockedTime.create(req.body);
  res.status(201).json({ data: blockedTime });
}

// DELETE /api/admin/blocked-times/:id
export async function deleteBlockedTime(req, res) {
  const deleted = await BlockedTime.findByIdAndDelete(req.params.id);
  if (!deleted) throw new AppError("Blocked time not found", 404);
  res.status(204).end(); // 204 No Content: success, nothing to send back
}
