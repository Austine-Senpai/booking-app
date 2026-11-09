import { useEffect } from "react";
import { useSettings } from "./useSettings.js";

// Sets the browser tab title: "Services · Fresh Fade Barbershop".
// Shows up in tabs, bookmarks, history and search results, and screen readers
// announce it when the page changes. Pass null for just the business name.
//
// Usage (top of a page component): usePageTitle("My bookings");
export function usePageTitle(title) {
  const { settings } = useSettings(); // cached, so this doesn't cost an extra request
  const businessName = settings?.businessName;

  useEffect(() => {
    const parts = [title, businessName].filter(Boolean);
    if (parts.length > 0) document.title = parts.join(" · ");
  }, [title, businessName]);
}
