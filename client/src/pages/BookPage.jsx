import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { getService } from "../api/services.js";
import { getSettings } from "../api/settings.js";
import { createBooking } from "../api/bookings.js";
import { useFetch } from "../hooks/useFetch.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import SlotPicker from "../components/SlotPicker.jsx";
import Button from "../components/Button.jsx";
import Textarea from "../components/Textarea.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getErrorMessage } from "../utils/apiErrors.js";
import { getBookableDays, firstOpenDay } from "../utils/bookingDays.js";
import { formatLongDate, formatTime } from "../utils/formatDateTime.js";
import { formatMoney } from "../utils/formatMoney.js";
import { formatDuration } from "../utils/formatDuration.js";

// /book/:serviceId?date=2026-11-12&slot=2026-11-12T09:00:00.000Z
//
// The chosen day and time live in the URL (not in state) so that:
//  - a logged-out visitor can log in and come back to the SAME step with the
//    same time still selected (the login page returns to this exact URL)
//  - refreshing the page or sharing the link keeps the choice
export default function BookPage() {
  const { serviceId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const service = useFetch(() => getService(serviceId), [serviceId]);
  const settings = useFetch(getSettings, []);
  usePageTitle(service.data ? `Book ${service.data.name}` : "Book an appointment");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);
  const summaryRef = useRef(null);

  const selectedStart = searchParams.get("slot");

  // When a time is picked (or we come back from logging in with one picked),
  // bring the summary + confirm button into view — on a phone it's below the fold.
  useEffect(() => {
    if (selectedStart) summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedStart, service.data, settings.data]);

  if (service.loading || settings.loading) return <Spinner fullPage />;

  if (service.error) {
    const notFound = service.error.response?.status === 404;
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        {notFound ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">This service isn't available</h1>
            <p className="mt-2 text-slate-600">It may have been removed. Please choose another one.</p>
            <Link to="/services" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
              See all services
            </Link>
          </>
        ) : (
          <ErrorMessage message={getErrorMessage(service.error)} onRetry={service.reload} />
        )}
      </div>
    );
  }
  if (settings.error) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <ErrorMessage message={getErrorMessage(settings.error)} onRetry={settings.reload} />
      </div>
    );
  }

  const { timezone, currency } = settings.data;
  const days = getBookableDays(settings.data);
  // Use the day from the URL if it's a bookable open day; otherwise the first open day
  const requestedDate = searchParams.get("date");
  const date = days.some((day) => day.date === requestedDate && day.isOpen) ? requestedDate : firstOpenDay(days);

  // Change some URL params, keep the rest. `replace` stops every tap from adding a
  // browser history entry (so "Back" leaves the page instead of undoing taps).
  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  function handleDateChange(newDate) {
    setError("");
    updateParams({ date: newDate, slot: null }); // a new day means the old time no longer applies
  }

  function handleSelectSlot(slot) {
    setError("");
    updateParams({ date, slot: slot.start });
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      const booking = await createBooking({ serviceId, startTime: selectedStart, notes });
      navigate(`/bookings/${booking._id}/confirmed`);
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.status === 409) {
        // Someone else got that time first: clear the choice and show fresh slots
        updateParams({ slot: null });
        setSlotsReloadKey((key) => key + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Send logged-out visitors to log in, then straight back to this exact step
  const returnHere = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/services" className="text-sm font-medium text-brand-700 hover:underline">
        ← All services
      </Link>

      {/* Service summary */}
      <header className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">{service.data.name}</h1>
        <p className="mt-1 text-slate-600">
          {formatDuration(service.data.durationMinutes)} · {formatMoney(service.data.price, currency)}
        </p>
        {service.data.description && <p className="mt-2 text-sm text-slate-600">{service.data.description}</p>}
      </header>

      <div className="mt-6">
        {date ? (
          <SlotPicker
            serviceId={serviceId}
            settings={settings.data}
            date={date}
            onDateChange={handleDateChange}
            selectedStart={selectedStart}
            onSelectSlot={handleSelectSlot}
            reloadKey={slotsReloadKey}
          />
        ) : (
          <p className="rounded-lg bg-slate-100 px-4 py-6 text-center text-slate-600">
            We're not taking bookings for the next two weeks. Please check back later.
          </p>
        )}
      </div>

      {/* A 409 clears the slot, so the error must be shown outside the summary */}
      <ErrorMessage message={error} className="mt-6" />

      {selectedStart && (
        <section ref={summaryRef} className="mt-6 scroll-mt-4 rounded-xl border border-brand-600 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">3. Confirm your booking</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Service</dt>
            <dd className="text-slate-900">{service.data.name}</dd>
            <dt className="text-slate-500">When</dt>
            <dd className="text-slate-900">
              {formatLongDate(selectedStart, timezone)} at {formatTime(selectedStart, timezone)}
            </dd>
            <dt className="text-slate-500">Price</dt>
            <dd className="text-slate-900">{formatMoney(service.data.price, currency)}</dd>
          </dl>

          {user ? (
            <div className="mt-4 space-y-4">
              <Textarea
                label="Notes (optional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                placeholder="Anything we should know?"
              />
              <Button onClick={handleConfirm} loading={submitting} className="w-full">
                Confirm booking
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Log in or create an account to confirm. We'll keep this time selected for you.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Link
                  to={`/login?redirect=${returnHere}`}
                  className="inline-flex flex-1 justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Log in to book
                </Link>
                <Link
                  to={`/register?redirect=${returnHere}`}
                  className="inline-flex flex-1 justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Create an account
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
