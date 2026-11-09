import { useEffect, useState } from "react";

// The current time, refreshed every minute.
// Rendering with `new Date()` directly gives a different answer on every render;
// this gives a stable value that still moves forward, so e.g. a booking's
// "Completed / No-show" buttons appear when it starts, even if the page stays open.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer); // stop the timer when the component goes away
  }, [intervalMs]);

  return now;
}
