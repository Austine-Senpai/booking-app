// Our API sends errors as { error: { message, details: [{ field, message }] } }.
// These helpers turn an axios error into something a page can show.

// One sentence for the top of a form or page
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const apiMessage = error?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  // Request sent but no response at all → server down or no internet
  if (error?.request && !error?.response) {
    return "Can't reach the server. Please check your connection and try again.";
  }
  return fallback;
}

// { email: "Enter a valid email address", password: "..." } for showing under each input
export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details ?? [];
  const fieldErrors = {};
  for (const { field, message } of details) {
    if (field && !fieldErrors[field]) fieldErrors[field] = message; // first message per field
  }
  return fieldErrors;
}
