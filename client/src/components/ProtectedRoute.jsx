import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./Spinner.jsx";

// Wraps routes that need a logged-in user (see App.jsx).
// Not logged in → /login?redirect=<where they were going>, so they come back after logging in.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still asking the API "who am I?" — don't redirect yet
  if (loading) return <Spinner fullPage />;

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />; // render the matching child route
}
