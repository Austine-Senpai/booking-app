import { useId } from "react";

// <Input label="Email" type="email" value={email} onChange={...} error={fieldErrors.email} />
// The label is linked to the input (click the label → focus the input), and the
// error is linked with aria-describedby so screen readers read it out.
export default function Input({ label, error, hint, id, className = "", ...rest }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        // text-base (16px): smaller text makes iPhones zoom in when the field is tapped
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 ${
          error ? "border-red-500 focus:outline-red-500" : "border-slate-300 focus:outline-brand-600"
        }`}
        {...rest}
      />
      {message && (
        <p id={messageId} className={`mt-1 text-sm ${error ? "text-red-600" : "text-slate-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
