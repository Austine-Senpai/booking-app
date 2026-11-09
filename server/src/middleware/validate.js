import { AppError } from "../utils/AppError.js";

// Usage in a route: router.post("/register", validate(registerSchema), register)
// On success, req.body is replaced with zod's cleaned output (trimmed, lowercased,
// unknown fields removed), so controllers can trust it.
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      // Turn zod's issues into a simple list the frontend can show next to each field
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError("Please check the highlighted fields", 400, details));
    }

    req.body = result.data;
    next();
  };
}
