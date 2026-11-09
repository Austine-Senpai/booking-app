import { useEffect, useState } from "react";

const SIZES = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };

// After this long, a full-page spinner explains the wait. Free hosting (e.g.
// Render's free tier) puts the server to sleep when idle, and the first visit
// can take up to a minute — without a message it just looks broken.
const SLOW_AFTER_MS = 5000;

// A spinning circle. Uses the current text colour, so it fits inside any button.
// fullPage → centred in a tall area (for whole-page loading).
export default function Spinner({ size = "md", fullPage = false, label = "Loading" }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!fullPage) return;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [fullPage]);

  const spinner = (
    <svg className={`${SIZES[size]} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );

  if (!fullPage) return spinner;

  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-brand-600">
      {spinner}
      <span className="sr-only">{label}</span>
      {slow && (
        <p className="max-w-xs text-center text-sm text-slate-600">
          Waking up the server… This can take up to a minute on the first visit.
        </p>
      )}
    </div>
  );
}
