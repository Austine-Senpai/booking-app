import { useSearchParams } from "react-router";
import { DateTime } from "luxon";
import { getAdminBookings } from "../../api/admin.js";
import { getSettings } from "../../api/settings.js";
import { useFetch } from "../../hooks/useFetch.js";
import AdminBookingList from "../../components/admin/AdminBookingList.jsx";
import Button from "../../components/Button.jsx";
import Input from "../../components/Input.jsx";
import Select from "../../components/Select.jsx";
import Spinner from "../../components/Spinner.jsx";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { getErrorMessage } from "../../utils/apiErrors.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled", label: "Cancelled" },
];

// Filters live in the URL (?date=2026-11-12&status=confirmed&page=2), so a
// refresh or the Back button keeps them. No ?date means "today"; ?date=all means every date.
export default function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const settings = useFetch(getSettings, []);

  const timezone = settings.data?.timezone;
  const today = timezone ? DateTime.now().setZone(timezone).toISODate() : null;
  const dateParam = searchParams.get("date");
  const allDates = dateParam === "all";
  const date = allDates ? null : dateParam || today;
  const status = searchParams.get("status") || "";
  const page = Number(searchParams.get("page")) || 1;

  const result = useFetch(
    async () => (timezone ? getAdminBookings({ date, status, page }) : null),
    [timezone, date, status, page]
  );

  // Changing a filter always goes back to page 1
  function setFilter(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    setSearchParams(next);
  }

  if (settings.loading) return <Spinner fullPage />;
  if (settings.error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorMessage message={getErrorMessage(settings.error)} onRetry={settings.reload} />
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input
          label="Date"
          type="date"
          value={date ?? ""}
          // Clearing the field means "all dates"; picking a day switches back to that day
          onChange={(event) => setFilter({ date: event.target.value || "all" })}
        />
        <Select label="Status" value={status} onChange={(event) => setFilter({ status: event.target.value })}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button variant={date === today && !allDates ? "primary" : "secondary"} onClick={() => setFilter({ date: null })}>
            Today
          </Button>
          <Button variant={allDates ? "primary" : "secondary"} onClick={() => setFilter({ date: "all" })}>
            All dates
          </Button>
        </div>
      </div>

      {/* Results */}
      <section aria-live="polite">
        {result.loading && <Spinner fullPage />}
        {!result.loading && result.error && (
          <ErrorMessage message={getErrorMessage(result.error)} onRetry={result.reload} />
        )}
        {!result.loading && data?.bookings.length === 0 && (
          <EmptyState title="No bookings found" message="Try another date or status." />
        )}
        {!result.loading && data?.bookings.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {data.total} booking{data.total === 1 ? "" : "s"}
            </p>
            <AdminBookingList
              bookings={data.bookings}
              settings={settings.data}
              showDate={allDates}
              onChanged={result.reload}
            />

            {data.totalPages > 1 && (
              <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setFilter({ page: page - 1 })}>
                  ← Previous
                </Button>
                <p className="text-sm text-slate-600">
                  Page {data.page} of {data.totalPages}
                </p>
                <Button
                  variant="secondary"
                  disabled={page >= data.totalPages}
                  onClick={() => setFilter({ page: page + 1 })}
                >
                  Next →
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
