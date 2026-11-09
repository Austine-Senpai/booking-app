import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { useSettings } from "../hooks/useSettings.js";

const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", end: true }, // end: only active on exactly /admin
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/blocked-times", label: "Blocked times" },
  { to: "/admin/settings", label: "Settings" },
];

function navLinkClass({ isActive }) {
  return `block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;
}

// Phones: business name + a sideways-scrolling tab bar at the top.
// Desktop (md+): a fixed sidebar on the left.
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  async function handleLogout() {
    // Leave the admin area FIRST, or AdminRoute would redirect to /login
    // the moment the user is cleared
    navigate("/");
    await logout();
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <a
        href="#main"
        className="sr-only rounded-lg bg-white px-4 py-2 font-semibold text-brand-700 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <p className="font-bold text-slate-900">{settings?.businessName ?? ""}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Admin</p>
        </div>

        {/* On phones the tabs scroll sideways; the scrollbar itself is hidden (swiping still works) */}
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:flex-1 md:flex-col md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {ADMIN_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden space-y-1 border-t border-slate-200 p-4 text-sm md:block">
          <p className="truncate text-slate-500">{user?.email}</p>
          <Link to="/" className="block py-1 text-slate-700 hover:text-brand-700">
            View website
          </Link>
          <button type="button" onClick={handleLogout} className="block py-1 text-slate-700 hover:text-brand-700">
            Log out
          </button>
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <Outlet />
        {/* On phones the sidebar footer is hidden, so offer these at the bottom */}
        <div className="flex gap-4 border-t border-slate-200 px-4 py-4 text-sm md:hidden">
          <Link to="/" className="text-slate-700">
            View website
          </Link>
          <button type="button" onClick={handleLogout} className="text-slate-700">
            Log out
          </button>
        </div>
      </main>
    </div>
  );
}
