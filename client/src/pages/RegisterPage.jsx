import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { getErrorMessage, getFieldErrors } from "../utils/apiErrors.js";
import { safeRedirect } from "../utils/safeRedirect.js";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function RegisterPage() {
  usePageTitle("Create an account");
  const { user, register } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = safeRedirect(redirectParam);

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Registering logs you in, which sets `user` → this redirects
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
      await register(form);
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const loginLink = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Already have one?{" "}
        <Link to={loginLink} className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <ErrorMessage message={error} />
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={fieldErrors.name}
        />
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
          label="Phone (optional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange}
          error={fieldErrors.phone}
          hint="So we can reach you if something changes"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          hint="At least 8 characters"
        />
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </div>
  );
}
