import { useEffect, useState } from "react";

// Loads data when a component mounts, and again whenever something in `deps` changes.
//
//   const { data, loading, error, reload } = useFetch(() => getMyBookings(tab), [tab]);
//
// Every page needs loading / error / data handling, so it lives here once.
// It also ignores a response that arrives after the inputs changed (e.g. you
// switched tabs quickly), so an old answer can never overwrite a newer one.
export function useFetch(load, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await load();
        if (!ignore) setData(result);
      } catch (err) {
        if (!ignore) setError(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();

    return () => {
      ignore = true;
    };
    // `load` is a new function on every render, so we can't list it here —
    // the caller's `deps` say when to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  // Call reload() to fetch again with the same inputs (e.g. after cancelling a booking)
  const reload = () => setReloadCount((count) => count + 1);

  return { data, loading, error, reload };
}
