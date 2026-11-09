import { AppError } from "../utils/AppError.js";

// Usage in a route:
//   router.post("/register", validate(registerSchema), register)       → checks req.body
//   router.get("/blocked-times", validate(listSchema, "query"), list)  → checks req.query
//
// On success the cleaned output (trimmed, lowercased, converted, unknown fields
// removed) is put back on the request, so controllers can trust it:
//   - body  → req.body
//   - query → req.validatedQuery (in Express 5 req.query is read-only and can't be replaced)
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      // Turn zod's issues into a simple list the frontend can show next to each field
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError("Please check the highlighted fields", 400, details));
    }

    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}
