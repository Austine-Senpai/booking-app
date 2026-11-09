import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { DateTime } from "luxon";
import { getMyBookings, cancelBooking, rescheduleBooking } from "../api/bookings.js";
import { getSettings } from "../api/settings.js";
import { useFetch } from "../hooks/useFetch.js";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import SlotPicker from "../components/SlotPicker.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { getErrorMessage } from "../utils/apiErrors.js";
import { canCustomerChange } from "../utils/bookingRules.js";
import { getBookableDays, firstOpenDay } from "../utils/bookingDays.js";
import { formatDateTime, formatLongDate, formatTime } from "../utils/formatDateTime.js";
import { formatMoney } from "../utils/formatMoney.js";
import { formatDuration } from "../utils/formatDuration.js";
import { usePageTitle } from "../hooks/usePageTitle.js";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

// One booking in the list
function BookingCard({ booking, settings, onCancel, onReschedule }) {
  const { timezone, currency, cancellationNoticeHours, phone } = settings;
  const start = DateTime.fromISO(booking.startTime, { zone: timezone });
  const canChange = canCustomerChange(booking, settings);
  // Confirmed and still in the future, but too close to change online
  const tooLateToChange = booking.status === "confirmed" && !canChange && start > DateTime.now();

  return (
    <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
      {/* Calendar-style date block */}
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-800">
        <span className="text-xs font-semibold uppercase">{start.toFormat("LLL")}</span>
        <span className="text-xl font-bold leading-none">{start.toFormat("d")}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{booking.service?.name ?? "Service"}</h3>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          {formatDateTime(booking.startTime, timezone)}
          {booking.service && ` · ${formatDuration(booking.service.durationMinutes)}`}
          {` · ${formatMoney(booking.priceAtBooking, currency)}`}
        </p>
        {booking.notes && <p className="mt-1 text-sm text-slate-500">"{booking.notes}"</p>}

        {canChange && (
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" className="px-3 py-1.5" onClick={() => onReschedule(booking)}>
              Reschedule
            </Button>
            <Button variant="dangerGhost" className="px-3 py-1.5" onClick={() => onCancel(booking)}>
              Cancel
            </Button>
          </div>
        )}

        {tooLateToChange && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            It's less than {cancellationNoticeHours} hours until this appointment, so it can't be changed online.
            {phone && (
              <>
                {" "}
                Please call us on{" "}
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-semibold underline">
                  {phone}
                </a>
                .
              </>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

export default function MyBookingsPage() {
  usePageTitle("My bookings");
  // The tab lives in the URL (?tab=past) so a refresh keeps you on the same tab
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "past" ? "past" : "upcoming";

  const bookings = useFetch(() => getMyBookings(tab), [tab]);
  const settings = useFetch(getSettings, []);
  const [successMessage, setSuccessMessage] = useState("");

  // Cancel popup
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Reschedule popup
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState(null);
  const [newSlot, setNewSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

  function changeTab(id) {
    setSuccessMessage("");
    setSearchParams(id === "past" ? { tab: "past" } : {});
  }

  // ----- Cancel -----
  function openCancel(booking) {
    setSuccessMessage("");
    setCancelError("");
    setCancelTarget(booking);
  }

  async function confirmCancel() {
    setCancelling(true);
    setCancelError("");
    try {
      await cancelBooking(cancelTarget._id);
      setCancelTarget(null);
      setSuccessMessage("Your booking has been cancelled.");
      bookings.reload();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  // ----- Reschedule -----
  function openReschedule(booking) {
    const { timezone } = settings.data;
    const days = getBookableDays(settings.data);
    // Start on the booking's current day if it's in range, otherwise the first open day
    const currentDay = DateTime.fromISO(booking.startTime, { zone: timezone }).toISODate();
    const startDay = days.some((day) => day.date === currentDay && day.isOpen) ? currentDay : firstOpenDay(days);

    setSuccessMessage("");
    setRescheduleError("");
    setNewDate(startDay);
    setNewSlot(null);
    setRescheduleTarget(booking);
  }

  async function confirmReschedule() {
    setRescheduling(true);
    setRescheduleError("");
    try {
      const updated = await rescheduleBooking(rescheduleTarget._id, newSlot.start);
      const { timezone } = settings.data;
      setRescheduleTarget(null);
      setSuccessMessage(
        `Your booking has been moved to ${formatLongDate(updated.startTime, timezone)} at ${formatTime(updated.startTime, timezone)}.`
      );
      bookings.reload();
    } catch (err) {
      setRescheduleError(getErrorMessage(err));
      if (err.response?.status === 409) {
        setNewSlot(null);
        setSlotsReloadKey((key) => key + 1); // show the fresh free times
      }
    } finally {
      setRescheduling(false);
    }
  }

  // ----- Render -----
  let content;
  if (bookings.loading || settings.loading) {
    content = <Spinner fullPage />;
  } else if (bookings.error || settings.error) {
    content = (
      <ErrorMessage
        message={getErrorMessage(bookings.error || settings.error)}
        onRetry={() => (bookings.error ? bookings.reload() : settings.reload())}
      />
    );
  } else if (bookings.data.length === 0) {
    content =
      tab === "upcoming" ? (
        <EmptyState
          title="No upcoming bookings"
          message="When you book an appointment, it will show up here."
          action={
            <Link
              to="/services"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Book now
            </Link>
          }
        />
      ) : (
        <EmptyState title="No past bookings yet" message="Your booking history will appear here." />
      );
  } else {
    content = (
      <ul className="space-y-3">
        {bookings.data.map((booking) => (
          <BookingCard
            key={booking._id}
            booking={booking}
            settings={settings.data}
            onCancel={openCancel}
            onReschedule={openReschedule}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">My bookings</h1>

      <div role="tablist" aria-label="Bookings" className="mt-4 inline-flex rounded-lg bg-slate-200 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="bookings-panel"
            onClick={() => changeTab(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {successMessage && (
        <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      <div role="tabpanel" id="bookings-panel" aria-labelledby={`tab-${tab}`} className="mt-4">
        {content}
      </div>

      {/* Cancel confirmation */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this booking?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={confirmCancel} loading={cancelling}>
              Cancel booking
            </Button>
          </>
        }
      >
        {cancelTarget && settings.data && (
          <>
            <p>
              {cancelTarget.service?.name} on {formatLongDate(cancelTarget.startTime, settings.data.timezone)} at{" "}
              {formatTime(cancelTarget.startTime, settings.data.timezone)}. This can't be undone.
            </p>
            <ErrorMessage message={cancelError} className="mt-3" />
          </>
        )}
      </Modal>

      {/* Reschedule: the same picker as the booking page */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title={`Move your ${rescheduleTarget?.service?.name ?? "booking"}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRescheduleTarget(null)} disabled={rescheduling}>
              Keep current time
            </Button>
            <Button onClick={confirmReschedule} loading={rescheduling} disabled={!newSlot}>
              {newSlot ? `Move to ${newSlot.label}` : "Pick a new time"}
            </Button>
          </>
        }
      >
        {rescheduleTarget && settings.data && (
          <div className="space-y-4">
            <p>
              Currently {formatLongDate(rescheduleTarget.startTime, settings.data.timezone)} at{" "}
              {formatTime(rescheduleTarget.startTime, settings.data.timezone)}.
            </p>
            {newDate ? (
              <SlotPicker
                serviceId={rescheduleTarget.service._id}
                settings={settings.data}
                date={newDate}
                onDateChange={(date) => {
                  setNewDate(date);
                  setNewSlot(null);
                  setRescheduleError("");
                }}
                selectedStart={newSlot?.start ?? null}
                onSelectSlot={(slot) => {
                  setNewSlot(slot);
                  setRescheduleError("");
                }}
                reloadKey={slotsReloadKey}
              />
            ) : (
              <p>There are no open days in the next two weeks.</p>
            )}
            <ErrorMessage message={rescheduleError} />
          </div>
        )}
      </Modal>
    </div>
  );
}
