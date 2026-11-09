const STYLES = {
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800" },
  completed: { label: "Completed", className: "bg-slate-200 text-slate-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
  no_show: { label: "No-show", className: "bg-amber-100 text-amber-800" },
};

// <StatusBadge status="confirmed" /> → a small coloured pill
export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
