// Builds an .ics calendar file — the standard format that Google Calendar,
// Apple Calendar and Outlook all understand — so customers can add their
// booking to their calendar with one tap.

// "2026-11-12T09:00:00.000Z" → "20261112T090000Z" (the format .ics expects)
function toIcsDate(isoString) {
  return new Date(isoString).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Commas, semicolons, backslashes and newlines have special meaning in .ics text
function escapeText(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/[,;]/g, (match) => `\\${match}`);
}

export function buildIcs({ id, start, end, title, location, description }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booking App//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${id}@booking-app`, // stable id: adding twice updates instead of duplicating
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeText(title)}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n"); // the .ics standard requires Windows-style line endings
}

// Makes the browser download `content` as a file
export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
