import { Link } from "react-router";
import { DateTime } from "luxon";
import { getStats, getAdminBookings } from "../../api/admin.js";
import { getSettings } from "../../api/settings.js";
import { useFetch } from "../../hooks/useFetch.js";
import { useNow } from "../../hooks/useNow.js";
import AdminBookingList from "../../components/admin/AdminBookingList.jsx";
import Spinner from "../../components/Spinner.jsx";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { getErrorMessage } from "../../utils/apiErrors.js";
import { formatLongDate } from "../../utils/formatDateTime.js";
import { formatMoney } from "../../utils/formatMoney.js";
import { usePageTitle } from "../../hooks/usePageTitle.js";

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  usePageTitle("Admin: Dashboard");
  const settings = useFetch(getSettings, []);
  const stats = useFetch(getStats, []);
  const now = useNow();
  // "Today" in the BUSINESS timezone — only known once settings have loaded
  const timezone = settings.data?.timezone;
  const today = timezone ? DateTime.now().setZone(timezone).toISODate() : null;
  // Today's whole schedule fits on one page for a single-chair business
  const schedule = useFetch(async () => (today ? getAdminBookings({ date: today }) : null), [today]);

  if (settings.loading) return <Spinner fullPage />;
  if (settings.error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorMessage message={getErrorMessage(settings.error)} onRetry={settings.reload} />
      </div>
    );
  }

  // After a status change both the numbers and the schedule may change
  function reloadAll() {
    stats.reload();
    schedule.reload();
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">{formatLongDate(now, timezone)}</p>
      </div>

      <section aria-label="Statistics">
        {stats.error && <ErrorMessage message={getErrorMessage(stats.error)} onRetry={stats.reload} />}
        {stats.loading && !stats.data && <Spinner />}
        {stats.data && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Today's bookings" value={stats.data.todayCount} />
            <StatCard label="Upcoming" value={stats.data.upcomingCount} hint="Confirmed, from now on" />
            <StatCard label="This week" value={stats.data.weekCount} hint="Bookings, Mon–Sun" />
            <StatCard
              label="Revenue this week"
              value={formatMoney(stats.data.weekRevenue, settings.data.currency)}
              hint="From completed bookings"
            />
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Today's schedule</h2>
          <Link to="/admin/bookings" className="text-sm font-semibold text-brand-700 hover:underline">
            All bookings →
          </Link>
        </div>

        {schedule.loading && !schedule.data && <Spinner />}
        {schedule.error && <ErrorMessage message={getErrorMessage(schedule.error)} onRetry={schedule.reload} />}
        {schedule.data?.bookings.length === 0 && (
          <EmptyState title="Nothing booked today" message="New bookings for today will show up here." />
        )}
        {schedule.data?.bookings.length > 0 && (
          <AdminBookingList bookings={schedule.data.bookings} settings={settings.data} onChanged={reloadAll} />
        )}
      </section>
    </div>
  );
}
