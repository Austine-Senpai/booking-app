import { useId } from "react";

// Like <Input>, for longer text. Pass maxLength to show a "12/500" counter.
export default function Textarea({ label, error, hint, id, maxLength, value = "", className = "", ...rest }) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={textareaId}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        rows={3}
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 ${
          error ? "border-red-500 focus:outline-red-500" : "border-slate-300 focus:outline-brand-600"
        }`}
        {...rest}
      />
      <div className="mt-1 flex justify-between gap-4 text-sm">
        <p id={messageId} className={error ? "text-red-600" : "text-slate-500"}>
          {message}
        </p>
        {maxLength && (
          <p className="shrink-0 text-slate-400">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
