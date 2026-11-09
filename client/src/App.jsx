import { Route, Routes } from "react-router";

import PublicLayout from "./layouts/PublicLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

import HomePage from "./pages/HomePage.jsx";
import ServicesPage from "./pages/ServicesPage.jsx";
import BookPage from "./pages/BookPage.jsx";
import BookingConfirmedPage from "./pages/BookingConfirmedPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage.jsx";
import AdminServicesPage from "./pages/admin/AdminServicesPage.jsx";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.jsx";
import AdminBlockedTimesPage from "./pages/admin/AdminBlockedTimesPage.jsx";

// All routes in one place. Routes without a `path` are "wrappers": they
// render a layout or a login check around the routes nested inside them.
export default function App() {
  return (
    <Routes>
      {/* Customer-facing site */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        {/* Public to look at; logging in is only required to confirm (Phase 7) */}
        <Route path="book/:serviceId" element={<BookPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Logged-in customers only */}
        <Route element={<ProtectedRoute />}>
          <Route path="my-bookings" element={<MyBookingsPage />} />
          <Route path="bookings/:id/confirmed" element={<BookingConfirmedPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin area: admin check first, then the admin layout */}
      <Route path="admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="blocked-times" element={<AdminBlockedTimesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
