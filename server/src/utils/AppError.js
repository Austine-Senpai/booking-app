// An error we throw on purpose, with an HTTP status code attached.
// Example: throw new AppError("Service not found", 404);
// The errorHandler middleware turns it into { error: { message, details } }.
export class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details; // optional, e.g. a list of field validation errors
  }
}
