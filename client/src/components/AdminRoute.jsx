import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./Spinner.jsx";

// Wraps every /admin route (see App.jsx).
// This only hides admin PAGES — the real protection is on the server
// (requireAdmin returns 403), because anyone can change frontend code in their browser.
export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullPage />;

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Logged in but not an admin → back to the home page
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
