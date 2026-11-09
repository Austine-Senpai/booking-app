import { useState } from "react";
import { updateBookingStatus } from "../../api/admin.js";
import { useNow } from "../../hooks/useNow.js";
import Button from "../Button.jsx";
import Modal from "../Modal.jsx";
import ErrorMessage from "../ErrorMessage.jsx";
import StatusBadge from "../StatusBadge.jsx";
import { getErrorMessage } from "../../utils/apiErrors.js";
import { formatDate, formatTime, formatLongDate } from "../../utils/formatDateTime.js";
import { formatMoney } from "../../utils/formatMoney.js";

// Bookings with the owner's actions. Used on the Dashboard (today's schedule)
// and the Bookings page, so both behave exactly the same.
//   showDate  → also show the date on each card (not needed for "today")
//   onChanged → called after a status change, so the page can reload its data
export default function AdminBookingList({ bookings, settings, showDate = false, onChanged }) {
  const { timezone, currency } = settings;
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const now = useNow();

  async function changeStatus(booking, status) {
    setBusyId(booking._id);
    setError("");
    try {
      await updateBookingStatus(booking._id, status);
      setCancelTarget(null);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setCancelTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <ErrorMessage message={error} className="mb-3" />

      <ul className="space-y-3">
        {bookings.map((booking) => {
          const { customer, service } = booking;
          const hasStarted = new Date(booking.startTime) <= now;
          const busy = busyId === booking._id;
          const phoneHref = customer?.phone ? `tel:${customer.phone.replace(/\s/g, "")}` : null;

          return (
            <li key={booking._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {showDate && <span className="text-slate-500">{formatDate(booking.startTime, timezone)} · </span>}
                    {formatTime(booking.startTime, timezone)}–{formatTime(booking.endTime, timezone)}
                  </p>
                  <p className="text-sm text-slate-700">
                    {service?.name ?? "Deleted service"} · {formatMoney(booking.priceAtBooking, currency)}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              <div className="mt-2 text-sm text-slate-600">
                <p className="font-medium text-slate-800">{customer?.name ?? "Unknown customer"}</p>
                <p className="flex flex-wrap gap-x-3">
                  {phoneHref && (
                    <a href={phoneHref} className="text-brand-700 hover:underline">
                      {customer.phone}
                    </a>
                  )}
                  {customer?.email && <span className="break-all">{customer.email}</span>}
                </p>
                {booking.notes && <p className="mt-1 text-slate-500">"{booking.notes}"</p>}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {booking.status === "confirmed" && hasStarted && (
                  <>
                    <Button variant="secondary" className="px-3 py-1.5" loading={busy} onClick={() => changeStatus(booking, "completed")}>
                      Completed
                    </Button>
                    <Button variant="secondary" className="px-3 py-1.5" disabled={busy} onClick={() => changeStatus(booking, "no_show")}>
                      No-show
                    </Button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <Button variant="dangerGhost" className="px-3 py-1.5" disabled={busy} onClick={() => setCancelTarget(booking)}>
                    Cancel
                  </Button>
                )}
                {booking.status !== "confirmed" && (
                  // Undo a mistake. The server refuses (409) if someone else has taken the time since.
                  <Button variant="ghost" className="px-3 py-1.5" loading={busy} onClick={() => changeStatus(booking, "confirmed")}>
                    Reopen
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this booking?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={Boolean(busyId)}>
              Keep it
            </Button>
            <Button variant="danger" loading={Boolean(busyId)} onClick={() => changeStatus(cancelTarget, "cancelled")}>
              Cancel booking
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p>
            {cancelTarget.customer?.name}'s {cancelTarget.service?.name} on{" "}
            {formatLongDate(cancelTarget.startTime, timezone)} at {formatTime(cancelTarget.startTime, timezone)}. The
            customer will get an email saying the business cancelled.
          </p>
        )}
      </Modal>
    </>
  );
}
