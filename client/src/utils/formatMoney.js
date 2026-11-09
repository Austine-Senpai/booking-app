// Kobo (integer, as stored by the API) → "₦5,000" for display.
// Only ever format for display; always send and store kobo.
export function formatMoney(kobo, currency = "NGN") {
  const amount = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    // ₦5,000 rather than ₦5,000.00 — but keep kobo if there are any (₦5,000.50)
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
