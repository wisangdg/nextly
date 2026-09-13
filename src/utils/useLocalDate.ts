import { useState, useEffect } from "react";
import { getTodayLocalDateString } from "./dateUtils.ts";

/**
 * Hook providing the current local calendar date string (YYYY-MM-DD).
 * Automatically updates when returning to the tab, gaining window focus,
 * or crossing midnight.
 */
export function useLocalDate(): string {
  const [todayStr, setTodayStr] = useState<string>(() => getTodayLocalDateString());

  useEffect(() => {
    const updateIfNeeded = () => {
      const current = getTodayLocalDateString();
      setTodayStr((prev) => (prev !== current ? current : prev));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateIfNeeded();
      }
    };

    const handleFocus = () => {
      updateIfNeeded();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Schedule exact timer for next midnight transition
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());
    const midnightTimerId = setTimeout(updateIfNeeded, msUntilMidnight);

    // Periodically check every 30 seconds for day transition (fallback/safari sleep recovery)
    const intervalId = setInterval(updateIfNeeded, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(midnightTimerId);
      clearInterval(intervalId);
    };
  }, []);

  return todayStr;
}
