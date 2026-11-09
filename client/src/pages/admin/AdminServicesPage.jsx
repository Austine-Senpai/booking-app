import { useState } from "react";
import { getAdminServices, createService, updateService } from "../../api/admin.js";
import { getSettings } from "../../api/settings.js";
import { useFetch } from "../../hooks/useFetch.js";
import Button from "../../components/Button.jsx";
import Input from "../../components/Input.jsx";
import Textarea from "../../components/Textarea.jsx";
import Modal from "../../components/Modal.jsx";
import Spinner from "../../components/Spinner.jsx";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { getErrorMessage, getFieldErrors } from "../../utils/apiErrors.js";
import { formatMoney } from "../../utils/formatMoney.js";
import { formatDuration } from "../../utils/formatDuration.js";

const EMPTY_FORM = { name: "", description: "", durationMinutes: "30", priceNaira: "" };

// The admin types naira ("5000" or "5000.50"); the API stores kobo (500000).
// Returns null if it isn't a sensible amount.
function nairaToKobo(text) {
  const cleaned = text.replace(/,/g, "").trim(); // allow "5,000"
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  // Math.round: 19.99 * 100 is 1998.9999999999998 in JavaScript floats
  return Math.round(Number(cleaned) * 100);
}

function koboToNairaText(kobo) {
  return String(kobo / 100);
}

export default function AdminServicesPage() {
  const services = useFetch(getAdminServices, []);
  const settings = useFetch(getSettings, []);
  const currency = settings.data?.currency;

  // The add/edit popup. editing = null → adding a new service
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: String(service.durationMinutes),
      priceNaira: koboToNairaText(service.price),
    });
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  }

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSave(event) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");

    const price = nairaToKobo(form.priceNaira);
    if (price === null) {
      setFieldErrors({ price: "Enter an amount in naira, e.g. 5000 or 5000.50" });
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      durationMinutes: Number(form.durationMinutes),
      price,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateService(editing._id, payload);
        setSuccessMessage(`Saved changes to ${payload.name}.`);
      } else {
        await createService(payload);
        setSuccessMessage(`Added ${payload.name}. Customers can book it now.`);
      }
      setFormOpen(false);
      services.reload();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service) {
    setTogglingId(service._id);
    setListError("");
    setSuccessMessage("");
    try {
      await updateService(service._id, { isActive: !service.isActive });
      setSuccessMessage(
        service.isActive
          ? `${service.name} is hidden from customers. Existing bookings are kept.`
          : `${service.name} is bookable again.`
      );
      services.reload();
    } catch (err) {
      setListError(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <Button onClick={openAdd}>Add service</Button>
      </div>

      {successMessage && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}
      <ErrorMessage message={listError} />

      {services.loading && !services.data && <Spinner fullPage />}
      {services.error && <ErrorMessage message={getErrorMessage(services.error)} onRetry={services.reload} />}
      {services.data?.length === 0 && (
        <EmptyState title="No services yet" message="Add your first service so customers can book." />
      )}

      {services.data?.length > 0 && (
        <ul className="space-y-3">
          {services.data.map((service) => (
            <li
              key={service._id}
              className={`rounded-xl border bg-white p-4 ${service.isActive ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{service.name}</h2>
                    {!service.isActive && (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {formatDuration(service.durationMinutes)} · {formatMoney(service.price, currency)}
                  </p>
                  {service.description && <p className="mt-1 text-sm text-slate-500">{service.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="px-3 py-1.5" onClick={() => openEdit(service)}>
                    Edit
                  </Button>
                  <Button
                    variant={service.isActive ? "dangerGhost" : "ghost"}
                    className="px-3 py-1.5"
                    loading={togglingId === service._id}
                    onClick={() => toggleActive(service)}
                  >
                    {service.isActive ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit ${editing.name}` : "Add a service"}>
        {/* The form's own buttons (not Modal `actions`) so Enter submits it */}
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <ErrorMessage message={formError} />
          <Input label="Name" name="name" value={form.name} onChange={handleChange} error={fieldErrors.name} />
          <Textarea
            label="Description (optional)"
            name="description"
            value={form.description}
            onChange={handleChange}
            maxLength={1000}
            error={fieldErrors.description}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (minutes)"
              name="durationMinutes"
              type="number"
              inputMode="numeric"
              min={5}
              max={480}
              step={5}
              value={form.durationMinutes}
              onChange={handleChange}
              error={fieldErrors.durationMinutes}
            />
            <Input
              label="Price (₦)"
              name="priceNaira"
              inputMode="decimal"
              placeholder="5000"
              value={form.priceNaira}
              onChange={handleChange}
              error={fieldErrors.price}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save changes" : "Add service"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
