import { getAvailableSlots } from "../api/availability.js";
import { useFetch } from "../hooks/useFetch.js";
import { getBookableDays } from "../utils/bookingDays.js";
import Spinner from "./Spinner.jsx";
import ErrorMessage from "./ErrorMessage.jsx";

// Pick a day, then a free time. Used by the booking page AND the reschedule popup.
// It doesn't keep the choice itself — the parent does (the booking page keeps it
// in the URL, the popup in state) and passes it back in:
//   date          "YYYY-MM-DD" currently selected day
//   selectedStart the chosen slot's `start` (UTC ISO string), or null
//   reloadKey     change this number to fetch the slots again (e.g. after a 409)
export default function SlotPicker({ serviceId, settings, date, onDateChange, selectedStart, onSelectSlot, reloadKey = 0 }) {
  const days = getBookableDays(settings);
  const selectedDay = days.find((day) => day.date === date);

  const { data: slots, loading, error, reload } = useFetch(
    // No day chosen (e.g. closed for the next two weeks) → nothing to ask the server
    async () => (date ? getAvailableSlots(serviceId, date) : []),
    [serviceId, date, reloadKey]
  );

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">1. Pick a day</legend>
        {/* 7 columns → two neat weeks that fit a phone screen without scrolling */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const isSelected = day.date === date;
            return (
              <button
                key={day.date}
                type="button"
                disabled={!day.isOpen}
                aria-pressed={isSelected}
                aria-label={`${day.longLabel}${day.isOpen ? "" : " (closed)"}`}
                onClick={() => onDateChange(day.date)}
                className={`flex flex-col items-center rounded-lg border py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400 ${
                  isSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-brand-600"
                }`}
              >
                <span>{day.isToday ? "Today" : day.weekday}</span>
                <span className="text-base font-semibold">{day.dayNumber}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          2. Pick a time{selectedDay && <span className="font-normal text-slate-600"> on {selectedDay.longLabel}</span>}
        </legend>

        {loading && (
          <div className="flex justify-center py-6 text-brand-600">
            <Spinner />
          </div>
        )}

        {!loading && error && <ErrorMessage message="We couldn't load the free times." onRetry={reload} />}

        {!loading && !error && slots?.length === 0 && (
          <p className="rounded-lg bg-slate-100 px-4 py-6 text-center text-sm text-slate-600">
            No slots available on this day. Please try another day.
          </p>
        )}

        {!loading && !error && slots?.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isSelected = slot.start === selectedStart;
              return (
                <button
                  key={slot.start}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectSlot(slot)}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-slate-800 hover:border-brand-600"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
