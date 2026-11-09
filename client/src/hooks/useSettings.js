import { useEffect, useState } from "react";
import { getSettings, clearSettingsCache } from "../api/settings.js";

// The admin Settings page fires this after saving, so every useSettings()
// (e.g. the business name in the navbar and sidebar) reloads straight away.
export const SETTINGS_UPDATED_EVENT = "settings-updated";

export function announceSettingsUpdated() {
  clearSettingsCache(); // the cached copy is out of date now
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
}

// Loads the public business settings when a component mounts (and again
// whenever the admin saves new settings).
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

    window.addEventListener(SETTINGS_UPDATED_EVENT, load);
    return () => {
      ignore = true;
      window.removeEventListener(SETTINGS_UPDATED_EVENT, load);
    };
  }, []);

  return { settings, loading, error };
}
