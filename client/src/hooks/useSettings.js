import { useEffect, useState } from "react";
import { getSettings } from "../api/settings.js";

// Loads the public business settings once when a component mounts.
// Usage: const { settings, loading, error } = useSettings();
export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If the component unmounts before the request finishes, ignore the result
    let ignore = false;

    async function load() {
      try {
        const data = await getSettings();
        if (!ignore) setSettings(data);
      } catch (err) {
        if (!ignore) setError(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();

    return () => {
      ignore = true;
    };
  }, []);

  return { settings, loading, error };
}
