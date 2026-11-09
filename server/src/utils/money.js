// Kobo (integer) → "₦5,000" for display.
// Prices are formatted on the client for the website; this server copy exists
// only because emails are a "display" too.
export function formatMoney(kobo, currency = "NGN") {
  const amount = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    // ₦5,000 rather than ₦5,000.00 — but keep kobo if there are any (₦5,000.50)
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
