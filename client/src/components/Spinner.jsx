const SIZES = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };

// A spinning circle. Uses the current text colour, so it fits inside any button.
// fullPage → centred in a tall area (for whole-page loading).
export default function Spinner({ size = "md", fullPage = false, label = "Loading" }) {
  const spinner = (
    <svg className={`${SIZES[size]} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );

  if (!fullPage) return spinner;

  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-brand-600">
      {spinner}
      <span className="sr-only">{label}</span>
    </div>
  );
}
