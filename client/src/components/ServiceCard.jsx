import { Link } from "react-router";
import { formatMoney } from "../utils/formatMoney.js";
import { formatDuration } from "../utils/formatDuration.js";

// One service with a "Book" button. Used on the Home and Services pages.
export default function ServiceCard({ service, currency = "NGN" }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
      {/* flex-1 lets the text grow, so the Book buttons line up across cards in a row */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">{service.name}</h3>
          <p className="shrink-0 font-semibold text-slate-900">{formatMoney(service.price, currency)}</p>
        </div>
        <p className="mt-1 text-sm text-slate-500">{formatDuration(service.durationMinutes)}</p>
        {service.description && <p className="mt-3 text-sm text-slate-600">{service.description}</p>}
      </div>
      <Link
        to={`/book/${service._id}`}
        aria-label={`Book ${service.name}`}
        className="mt-4 inline-flex justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Book
      </Link>
    </article>
  );
}
