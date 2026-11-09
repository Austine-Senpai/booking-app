import Spinner from "./Spinner.jsx";

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-slate-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-500",
};

// <Button loading={saving} onClick={save}>Save</Button>
// While `loading`, it shows a spinner and can't be clicked twice.
// type defaults to "button" so it never submits a form by accident; use type="submit" in forms.
export default function Button({
  variant = "primary",
  type = "button",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
