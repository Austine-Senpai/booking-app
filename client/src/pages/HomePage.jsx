import { Link } from "react-router";
import { Info } from "luxon";
import { getServices } from "../api/services.js";
import { getSettings } from "../api/settings.js";
import { useFetch } from "../hooks/useFetch.js";
import ServiceCard from "../components/ServiceCard.jsx";
import Spinner from "../components/Spinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getErrorMessage } from "../utils/apiErrors.js";

// ["Monday", …, "Sunday"] — index 0 is Monday, matching dayOfWeek 1 (Luxon style)
const DAY_NAMES = Info.weekdays("long");

const PREVIEW_COUNT = 3;

export default function HomePage() {
  const settings = useFetch(getSettings, []);
  const services = useFetch(getServices, []);

  if (settings.loading) return <Spinner fullPage />;
  if (settings.error) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <ErrorMessage message={getErrorMessage(settings.error)} onRetry={settings.reload} />
      </div>
    );
  }

  const { businessName, address, phone, workingHours, currency } = settings.data;
  const sortedHours = [...workingHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const phoneHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;
  const mapsHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  return (
    <>
      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{businessName}</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Book your next appointment online in under a minute. Pick a service, choose a time that suits you,
            and you're done.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/services"
              className="inline-flex justify-center rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Book an appointment
            </Link>
            {phoneHref && (
              <a
                href={phoneHref}
                className="inline-flex justify-center rounded-lg border border-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12">
        {/* About */}
        <section className="max-w-2xl">
          <h2 className="text-xl font-bold text-slate-900">Welcome</h2>
          <p className="mt-2 text-slate-600">
            No phone calls, no waiting around. See exactly which times are free, book the one that works for you,
            and get a confirmation by email. Plans changed? Cancel or move your booking online.
          </p>
        </section>

        {/* Services preview */}
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Our services</h2>
            <Link to="/services" className="text-sm font-semibold text-brand-700 hover:underline">
              See all services →
            </Link>
          </div>
          <div className="mt-4">
            {services.loading && <Spinner />}
            {services.error && <ErrorMessage message={getErrorMessage(services.error)} onRetry={services.reload} />}
            {services.data?.length === 0 && <p className="text-slate-600">Services will be listed here soon.</p>}
            {services.data?.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.data.slice(0, PREVIEW_COUNT).map((service) => (
                  <ServiceCard key={service._id} service={service} currency={currency} />
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-10 md:grid-cols-2">
          {/* Opening hours */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">Opening hours</h2>
            <table className="mt-4 w-full max-w-sm text-sm">
              <tbody>
                {sortedHours.map((day) => (
                  <tr key={day.dayOfWeek} className="border-b border-slate-200 last:border-0">
                    <th scope="row" className="py-2 text-left font-medium text-slate-700">
                      {DAY_NAMES[day.dayOfWeek - 1]}
                    </th>
                    <td className={`py-2 text-right ${day.isOpen ? "text-slate-900" : "text-slate-400"}`}>
                      {day.isOpen ? `${day.open} – ${day.close}` : "Closed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Contact */}
          {(address || phone) && (
            <section>
              <h2 className="text-xl font-bold text-slate-900">Find us</h2>
              <div className="mt-4 space-y-2 text-slate-700">
                {address && (
                  <p>
                    {address}
                    <br />
                    <a href={mapsHref} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">
                      Open in Google Maps ↗
                    </a>
                  </p>
                )}
                {phone && (
                  <p>
                    <a href={phoneHref} className="font-semibold text-brand-700 hover:underline">
                      {phone}
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
