import Button from "./Button.jsx";

// A red box for errors. Pass onRetry to show a "Try again" button
// (e.g. when loading a page's data failed).
export default function ErrorMessage({ message, onRetry, className = "" }) {
  if (!message) return null;

  return (
    <div role="alert" className={`rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 ${className}`}>
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
