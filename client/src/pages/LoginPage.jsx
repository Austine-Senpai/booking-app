import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import DemoAccounts from "../components/DemoAccounts.jsx";
import { getErrorMessage, getFieldErrors } from "../utils/apiErrors.js";
import { safeRedirect } from "../utils/safeRedirect.js";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function LoginPage() {
  usePageTitle("Log in");
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = safeRedirect(redirectParam);

  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (or just logged in) → go where they were heading.
  // This one line handles both cases, so handleSubmit doesn't need to navigate.
  if (user) return <Navigate to={redirectTo} replace />;

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      await login(form); // sets `user` → the <Navigate> above redirects
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Keep the redirect when switching to the sign-up page
  const registerLink = redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register";

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">
        New here?{" "}
        <Link to={registerLink} className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>

      {/* noValidate: let the API's messages show, so they're the same everywhere */}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <ErrorMessage message={error} />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>

      <DemoAccounts
        onUse={(account) => {
          setForm({ email: account.email, password: account.password });
          setError("");
          setFieldErrors({});
        }}
      />
    </div>
  );
}
