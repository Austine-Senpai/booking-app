import { useId } from "react";

// <Select label="Status" value={status} onChange={...}>
//   <option value="">All</option>
//   <option value="confirmed">Confirmed</option>
// </Select>
export default function Select({ label, error, id, className = "", children, ...rest }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-base text-slate-900 focus:outline-2 focus:outline-offset-0 ${
          error ? "border-red-500 focus:outline-red-500" : "border-slate-300 focus:outline-brand-600"
        }`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
