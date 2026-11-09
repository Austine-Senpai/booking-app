import { getServices } from "../api/services.js";
import { getSettings } from "../api/settings.js";
import { useFetch } from "../hooks/useFetch.js";
import ServiceCard from "../components/ServiceCard.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { getErrorMessage } from "../utils/apiErrors.js";

export default function ServicesPage() {
  const services = useFetch(getServices, []);
  const settings = useFetch(getSettings, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Services</h1>
      <p className="mt-1 text-slate-600">Choose a service to see the free times.</p>

      <div className="mt-6">
        {services.loading && <Spinner fullPage />}

        {services.error && <ErrorMessage message={getErrorMessage(services.error)} onRetry={services.reload} />}

        {services.data?.length === 0 && (
          <EmptyState title="No services yet" message="Please check back soon." />
        )}

        {services.data?.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.data.map((service) => (
              <ServiceCard key={service._id} service={service} currency={settings.data?.currency} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
