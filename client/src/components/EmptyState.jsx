// Shown when a list has nothing in it, e.g. "No upcoming bookings".
// `action` is optional, e.g. <Button>Book now</Button>
export default function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      {message && <p className="mt-1 text-sm text-slate-600">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
