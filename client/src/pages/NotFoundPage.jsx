import { Link } from "react-router";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you're looking for doesn't exist or has moved.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Go to the home page
      </Link>
    </div>
  );
}
