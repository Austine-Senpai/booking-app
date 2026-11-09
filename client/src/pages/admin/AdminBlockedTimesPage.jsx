import { useState } from "react";
import { DateTime } from "luxon";
import { getBlockedTimes, createBlockedTime, deleteBlockedTime } from "../../api/admin.js";
import { getSettings } from "../../api/settings.js";
import { useFetch } from "../../hooks/useFetch.js";
import Button from "../../components/Button.jsx";
import Input from "../../components/Input.jsx";
import Modal from "../../components/Modal.jsx";
import Spinner from "../../components/Spinner.jsx";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { getErrorMessage } from "../../utils/apiErrors.js";
import { usePageTitle } from "../../hooks/usePageTitle.js";

// How a block reads in the list, in the business timezone:
//   whole days:  "Fri 25 Dec 2026"  or  "Thu 24 Dec – Sat 26 Dec 2026"
//   part of day: "Mon 9 Nov 2026, 13:00 – 14:00"
function describeBlock(block, timezone) {
  const start = DateTime.fromISO(block.start, { zone: timezone });
  const end = DateTime.fromISO(block.end, { zone: timezone });
  const startsAtMidnight = start.equals(start.startOf("day"));
  const endsAtMidnight = end.equals(end.startOf("day"));

  if (startsAtMidnight && endsAtMidnight) {
    const lastDay = end.minus({ days: 1 }); // the end is the NEXT midnight
    if (lastDay.hasSame(start, "day")) return { when: start.toFormat("ccc d LLL yyyy"), wholeDay: true };
    return { when: `${start.toFormat("ccc d LLL")} – ${lastDay.toFormat("ccc d LLL yyyy")}`, wholeDay: true };
  }
  if (start.hasSame(end, "day")) {
    return { when: `${start.toFormat("ccc d LLL yyyy, HH:mm")} – ${end.toFormat("HH:mm")}`, wholeDay: false };
  }
  return { when: `${start.toFormat("ccc d LLL, HH:mm")} – ${end.toFormat("ccc d LLL yyyy, HH:mm")}`, wholeDay: false };
}

// Form values → { start, end } as ISO strings WITH the business timezone's
// offset (e.g. "+01:00"), so the server knows exactly which moment is meant.
// Returns an error message instead if the times don't make sense.
function formToRange(form, timezone) {
  if (!form.date) return { error: "Pick a date." };

  if (form.wholeDay) {
    const lastDate = form.endDate || form.date;
    const start = DateTime.fromISO(form.date, { zone: timezone }).startOf("day");
    // Blocks run up to (not including) the end, so a whole day ends at the NEXT midnight
    const end = DateTime.fromISO(lastDate, { zone: timezone }).startOf("day").plus({ days: 1 });
    if (end <= start) return { error: "The last day can't be before the first day." };
    return { start: start.toISO(), end: end.toISO() };
  }

  if (!form.startTime || !form.endTime) return { error: "Pick a start and end time." };
  const start = DateTime.fromISO(`${form.date}T${form.startTime}`, { zone: timezone });
  const end = DateTime.fromISO(`${form.date}T${form.endTime}`, { zone: timezone });
  if (end <= start) return { error: "The end time must be after the start time." };
  return { start: start.toISO(), end: end.toISO() };
}

export default function AdminBlockedTimesPage() {
  usePageTitle("Admin: Blocked times");
  const blocks = useFetch(getBlockedTimes, []);
  const settings = useFetch(getSettings, []);
  const timezone = settings.data?.timezone;

  const today = timezone ? DateTime.now().setZone(timezone).toISODate() : "";
  const emptyForm = { date: "", endDate: "", wholeDay: false, startTime: "13:00", endTime: "14:00", reason: "" };
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function handleAdd(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const range = formToRange(form, timezone);
    if (range.error) {
      setFormError(range.error);
      return;
    }

    setAdding(true);
    try {
      await createBlockedTime({ start: range.start, end: range.end, reason: form.reason });
      setSuccessMessage("Blocked. Those times are no longer bookable.");
      setForm(emptyForm);
      blocks.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteBlockedTime(deleteTarget._id);
      setDeleteTarget(null);
      setSuccessMessage("Removed. Those times can be booked again.");
      blocks.reload();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (settings.loading) return <Spinner fullPage />;
  if (settings.error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorMessage message={getErrorMessage(settings.error)} onRetry={settings.reload} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Blocked times</h1>
        <p className="text-slate-600">Holidays, lunch breaks or personal time — nobody can book these.</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} noValidate className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-6">
        <h2 className="font-semibold text-slate-900">Block some time</h2>
        <ErrorMessage message={formError} />

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="wholeDay" checked={form.wholeDay} onChange={handleChange} className="h-5 w-5 accent-brand-600" />
          Whole day(s)
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={form.wholeDay ? "First day" : "Date"}
            name="date"
            type="date"
            min={today}
            value={form.date}
            onChange={handleChange}
          />
          {form.wholeDay ? (
            <Input
              label="Last day (optional)"
              name="endDate"
              type="date"
              min={form.date || today}
              value={form.endDate}
              onChange={handleChange}
              hint="For a holiday longer than one day"
            />
          ) : (
            <>
              <Input label="From" name="startTime" type="time" value={form.startTime} onChange={handleChange} />
              <Input label="To" name="endTime" type="time" value={form.endTime} onChange={handleChange} />
            </>
          )}
        </div>

        <Input
          label="Reason (optional)"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="e.g. Public holiday"
          maxLength={200}
          hint="Only you see this"
        />

        <Button type="submit" loading={adding}>
          Block time
        </Button>
      </form>

      {successMessage && (
        <p role="status" className="max-w-2xl rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      {/* Current + upcoming blocks */}
      <section className="max-w-2xl">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Current and upcoming</h2>
        {blocks.loading && !blocks.data && <Spinner />}
        {blocks.error && <ErrorMessage message={getErrorMessage(blocks.error)} onRetry={blocks.reload} />}
        {blocks.data?.length === 0 && <EmptyState title="Nothing blocked" message="Your opening hours apply as normal." />}
        {blocks.data?.length > 0 && (
          <ul className="space-y-2">
            {blocks.data.map((block) => {
              const { when, wholeDay } = describeBlock(block, timezone);
              return (
                <li key={block._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {when}
                      {wholeDay && <span className="ml-2 text-xs font-semibold uppercase text-slate-500">Whole day</span>}
                    </p>
                    {block.reason && <p className="text-sm text-slate-600">{block.reason}</p>}
                  </div>
                  <Button variant="dangerGhost" className="shrink-0 px-3 py-1.5" onClick={() => { setDeleteError(""); setDeleteTarget(block); }}>
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove this blocked time?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Remove
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <>
            <p>{describeBlock(deleteTarget, timezone).when} will become bookable again.</p>
            <ErrorMessage message={deleteError} className="mt-3" />
          </>
        )}
      </Modal>
    </div>
  );
}
