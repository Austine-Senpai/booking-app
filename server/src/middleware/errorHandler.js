import { AppError } from "../utils/AppError.js";

// Runs when no route matched the request.
export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Central error handler. Express only treats middleware as an error handler
// when it has exactly 4 parameters — keep all 4 parameters.
// Every error in the app (thrown in a route, or passed to next(err)) ends up here.
export function errorHandler(err, _req, res, next) {
  // #2 Response already started: let Express's built-in handler close it
  if (res.headersSent) return next(err);

  // #1 and #3: turn known errors into AppErrors first...
  if (err.type === "entity.parse.failed") err = new AppError("Invalid JSON in request body", 400);
  if (err.name === "CastError") err = new AppError("Resource not found", 404);
  if (err.code === 11000) err = new AppError("That value is already in use", 409);

  // ...then format every error the same way
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;
  if (isServerError) console.error(err);

  res.status(statusCode).json({
    error: {
      message: isServerError ? "Something went wrong" : err.message,
      // #4 never leak details on a server error
      ...(!isServerError && err.details && { details: err.details }),
    },
  });
}