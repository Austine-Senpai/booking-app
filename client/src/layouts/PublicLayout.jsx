import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { useSettings } from "../hooks/useSettings.js";

// Worked out once when the app loads — rendering should give the same result every time
const CURRENT_YEAR = new Date().getFullYear();

// Styling for nav links; the current page is highlighted
function navLinkClass({ isActive }) {
  return `block rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
  }`;
}

// Navbar + page + footer for every customer-facing page.
export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const businessName = settings?.businessName ?? "";
  const closeMenu = () => setMenuOpen(false);

  async function handleLogout() {
    closeMenu();
    // Leave the page FIRST: if we're on a protected page like /my-bookings,
    // clearing the user would make ProtectedRoute redirect to /login instead.
    navigate("/");
    await logout();
  }

  // Shared by the phone menu and the desktop bar
  const links = (
    <>
      <NavLink to="/services" className={navLinkClass} onClick={closeMenu}>
        Services
      </NavLink>
      {user ? (
        <>
          <NavLink to="/my-bookings" className={navLinkClass} onClick={closeMenu}>
            My bookings
          </NavLink>
          {user.role === "admin" && (
            <NavLink to="/admin" className={navLinkClass} onClick={closeMenu}>
              Admin
            </NavLink>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 md:w-auto"
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={navLinkClass} onClick={closeMenu}>
            Log in
          </NavLink>
          <Link
            to="/register"
            onClick={closeMenu}
            className="block rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Sign up
          </Link>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" onClick={closeMenu} className="text-lg font-bold text-slate-900">
            {/* min-width keeps the header from jumping while the name loads */}
            <span className="inline-block min-w-24">{businessName}</span>
          </Link>

          {/* Desktop: links in a row */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links}
          </nav>

          {/* Phone: a menu button */}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-menu" aria-label="Main" className="space-y-1 border-t border-slate-200 px-4 py-3 md:hidden">
            {links}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-1 px-4 py-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{businessName}</p>
          {settings?.address && <p>{settings.address}</p>}
          {settings?.phone && (
            <p>
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-brand-700">
                {settings.phone}
              </a>
            </p>
          )}
          <p className="pt-2 text-slate-400">
            © {CURRENT_YEAR} {businessName}
          </p>
        </div>
      </footer>
    </div>
  );
}
