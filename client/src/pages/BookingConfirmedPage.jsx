import { Link, useParams } from "react-router";
import { getMyBooking } from "../api/bookings.js";
import { getSettings } from "../api/settings.js";
import { useFetch } from "../hooks/useFetch.js";
import Button from "../components/Button.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { getErrorMessage } from "../utils/apiErrors.js";
import { formatLongDate, formatTime } from "../utils/formatDateTime.js";
import { formatMoney } from "../utils/formatMoney.js";
import { formatDuration } from "../utils/formatDuration.js";
import { buildIcs, downloadIcs } from "../utils/ics.js";
import { usePageTitle } from "../hooks/usePageTitle.js";

// Loads the booking from the API (not from the previous page), so it still
// works after a refresh or when opened later from a bookmark.
export default function BookingConfirmedPage() {
  usePageTitle("Booking confirmed");
  const { id } = useParams();
  const booking = useFetch(() => getMyBooking(id), [id]);
  const settings = useFetch(getSettings, []);

  if (booking.loading || settings.loading) return <Spinner fullPage />;

  const loadError = booking.error || settings.error;
  if (loadError) {
    const notFound = booking.error?.response?.status === 404;
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <ErrorMessage
          message={notFound ? "We couldn't find that booking." : getErrorMessage(loadError)}
          onRetry={notFound ? undefined : () => (booking.error ? booking.reload() : settings.reload())}
        />
        <Link to="/my-bookings" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
          Go to my bookings
        </Link>
      </div>
    );
  }

  const { service, startTime, endTime, priceAtBooking, notes, status } = booking.data;
  const { businessName, address, phone, timezone, currency } = settings.data;

  function handleAddToCalendar() {
    const ics = buildIcs({
      id,
      start: startTime,
      end: endTime,
      title: `${service.name} at ${businessName}`,
      location: address,
      description: [notes && `Notes: ${notes}`, phone && `Phone: ${phone}`].filter(Boolean).join("\n"),
    });
    downloadIcs(`booking-${service.name.toLowerCase().replace(/\W+/g, "-")}.ics`, ics);
  }

  const isConfirmed = status === "confirmed";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {isConfirmed ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">You're booked!</h1>
          <p className="mt-1 text-slate-600">We'll also email you the details.</p>
        </div>
      ) : (
        // e.g. opened again later, after the booking was cancelled
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Your booking</h1>
          <StatusBadge status={status} />
        </div>
      )}

      <dl className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <div>
          <dt className="text-slate-500">Service</dt>
          <dd className="font-medium text-slate-900">
            {service.name} · {formatDuration(service.durationMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">When</dt>
          <dd className="font-medium text-slate-900">
            {formatLongDate(startTime, timezone)} at {formatTime(startTime, timezone)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Price</dt>
          <dd className="font-medium text-slate-900">{formatMoney(priceAtBooking, currency)}</dd>
        </div>
        {address && (
          <div>
            <dt className="text-slate-500">Where</dt>
            <dd className="font-medium text-slate-900">{address}</dd>
          </div>
        )}
        {notes && (
          <div>
            <dt className="text-slate-500">Your notes</dt>
            <dd className="text-slate-900">{notes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-col gap-2">
        {isConfirmed && (
          <Button variant="secondary" onClick={handleAddToCalendar}>
            Add to calendar
          </Button>
        )}
        <Link
          to="/my-bookings"
          className="inline-flex justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          View my bookings
        </Link>
        <Link to="/services" className="py-2 text-center text-sm font-medium text-brand-700 hover:underline">
          Book something else
        </Link>
      </div>
    </div>
  );
}
