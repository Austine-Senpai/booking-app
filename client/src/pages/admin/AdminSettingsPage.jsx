import { useRef, useState } from "react";
import { Info } from "luxon";
import { getSettings } from "../../api/settings.js";
import { updateSettings } from "../../api/admin.js";
import { useFetch } from "../../hooks/useFetch.js";
import { announceSettingsUpdated } from "../../hooks/useSettings.js";
import Button from "../../components/Button.jsx";
import Input from "../../components/Input.jsx";
import Select from "../../components/Select.jsx";
import Spinner from "../../components/Spinner.jsx";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import { getErrorMessage, getFieldErrors } from "../../utils/apiErrors.js";

const DAY_NAMES = Info.weekdays("long"); // index 0 = Monday = dayOfWeek 1
const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60];

// Settings → form values. Numbers become text so the inputs can be edited freely
// (an empty box is "" while typing, not 0).
function toForm(settings) {
  return {
    businessName: settings.businessName,
    phone: settings.phone ?? "",
    address: settings.address ?? "",
    timezone: settings.timezone,
    currency: settings.currency,
    workingHours: [...settings.workingHours]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map(({ dayOfWeek, isOpen, open, close }) => ({ dayOfWeek, isOpen, open, close })),
    slotIntervalMinutes: String(settings.slotIntervalMinutes),
    minNoticeHours: String(settings.minNoticeHours),
    bookingWindowDays: String(settings.bookingWindowDays),
    cancellationNoticeHours: String(settings.cancellationNoticeHours),
  };
}

// The settings form, shown once the current settings have loaded
function SettingsForm({ initialSettings }) {
  const [form, setForm] = useState(() => toForm(initialSettings));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const errorRef = useRef(null);

  function handleChange(event) {
    setSaved(false);
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Update one field of one day, e.g. updateDay(0, { isOpen: false })
  function updateDay(index, changes) {
    setSaved(false);
    const workingHours = form.workingHours.map((day, i) => (i === index ? { ...day, ...changes } : day));
    setForm({ ...form, workingHours });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    setSaved(false);
    try {
      await updateSettings({
        ...form,
        slotIntervalMinutes: Number(form.slotIntervalMinutes),
        minNoticeHours: Number(form.minNoticeHours),
        bookingWindowDays: Number(form.bookingWindowDays),
        cancellationNoticeHours: Number(form.cancellationNoticeHours),
      });
      setSaved(true);
      announceSettingsUpdated(); // navbar/sidebar pick up a new business name straight away
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
      // The Save button is at the bottom of a long form; on a phone the error
      // summary would be off-screen and it would look like nothing happened.
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } finally {
      setSaving(false);
    }
  }

  const intervalOptions = INTERVAL_OPTIONS.includes(Number(form.slotIntervalMinutes))
    ? INTERVAL_OPTIONS
    : [...INTERVAL_OPTIONS, Number(form.slotIntervalMinutes)].sort((a, b) => a - b);

  const sectionClass = "space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-6";
  const timeInputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-base text-slate-900 focus:outline-2 focus:outline-brand-600 disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-6">
      <div ref={errorRef} className="scroll-mt-4">
        <ErrorMessage message={error} />
      </div>

      <section className={sectionClass}>
        <h2 className="font-semibold text-slate-900">Business</h2>
        <Input label="Business name" name="businessName" value={form.businessName} onChange={handleChange} error={fieldErrors.businessName} />
        <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} error={fieldErrors.phone} />
        <Input label="Address" name="address" value={form.address} onChange={handleChange} error={fieldErrors.address} />
        <p className="text-sm text-slate-500">
          Timezone: <span className="font-medium text-slate-700">{form.timezone}</span> · Currency:{" "}
          <span className="font-medium text-slate-700">{form.currency}</span>
        </p>
      </section>

      <section className={sectionClass}>
        <div>
          <h2 className="font-semibold text-slate-900">Opening hours</h2>
          <p className="text-sm text-slate-500">Customers can only book inside these hours.</p>
        </div>
        <ErrorMessage message={fieldErrors.workingHours} />

        <ul className="divide-y divide-slate-100">
          {form.workingHours.map((day, index) => {
            const dayName = DAY_NAMES[day.dayOfWeek - 1];
            const openError = fieldErrors[`workingHours.${index}.open`];
            const closeError = fieldErrors[`workingHours.${index}.close`];
            return (
              <li key={day.dayOfWeek} className="py-3">
                <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_6rem_1fr]">
                  <span className="font-medium text-slate-800">{dayName}</span>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={day.isOpen}
                      onChange={(event) => updateDay(index, { isOpen: event.target.checked })}
                      className="h-5 w-5 accent-brand-600"
                    />
                    {day.isOpen ? "Open" : "Closed"}
                  </label>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <input
                      type="time"
                      aria-label={`${dayName} opening time`}
                      value={day.open}
                      disabled={!day.isOpen}
                      onChange={(event) => updateDay(index, { open: event.target.value })}
                      className={timeInputClass}
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      aria-label={`${dayName} closing time`}
                      aria-invalid={closeError ? true : undefined}
                      value={day.close}
                      disabled={!day.isOpen}
                      onChange={(event) => updateDay(index, { close: event.target.value })}
                      className={`${timeInputClass} ${closeError ? "border-red-500" : ""}`}
                    />
                  </div>
                </div>
                {(openError || closeError) && <p className="mt-1 text-sm text-red-600">{openError || closeError}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className="font-semibold text-slate-900">Booking rules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="A slot can start every"
            name="slotIntervalMinutes"
            value={form.slotIntervalMinutes}
            onChange={handleChange}
            error={fieldErrors.slotIntervalMinutes}
          >
            {intervalOptions.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </Select>
          <Input
            label="Minimum notice (hours)"
            name="minNoticeHours"
            type="number"
            inputMode="numeric"
            min={0}
            max={168}
            value={form.minNoticeHours}
            onChange={handleChange}
            error={fieldErrors.minNoticeHours}
            hint="How soon before a slot it can still be booked"
          />
          <Input
            label="Booking window (days)"
            name="bookingWindowDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={form.bookingWindowDays}
            onChange={handleChange}
            error={fieldErrors.bookingWindowDays}
            hint="How far ahead customers can book"
          />
          <Input
            label="Cancellation notice (hours)"
            name="cancellationNoticeHours"
            type="number"
            inputMode="numeric"
            min={0}
            max={168}
            value={form.cancellationNoticeHours}
            onChange={handleChange}
            error={fieldErrors.cancellationNoticeHours}
            hint="Customers can't cancel or move a booking later than this"
          />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={saving}>
          Save settings
        </Button>
        {saved && (
          <p role="status" className="text-sm font-medium text-green-700">
            Saved. Customers see the changes straight away.
          </p>
        )}
      </div>
    </form>
  );
}

export default function AdminSettingsPage() {
  const settings = useFetch(getSettings, []);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      {settings.loading && <Spinner fullPage />}
      {settings.error && <ErrorMessage message={getErrorMessage(settings.error)} onRetry={settings.reload} />}
      {settings.data && <SettingsForm initialSettings={settings.data} />}
    </div>
  );
}
