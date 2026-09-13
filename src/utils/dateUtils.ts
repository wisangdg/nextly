/**
 * Date utility functions designed for local-first calendar accuracy.
 * Prevents UTC timezone shift bugs when handling date-only strings (YYYY-MM-DD).
 */

/**
 * Parses a YYYY-MM-DD string into a local Date object set to local midnight.
 */
export function parseLocalDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;

  const trimmed = dateString.trim();

  // If dateString contains a time component, validate that it is a genuine ISO timestamp
  let datePart = trimmed;
  if (trimmed.includes("T")) {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(trimmed);
    if (!isoMatch || isNaN(Date.parse(trimmed))) {
      return null;
    }
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    if (
      utcDate.getUTCFullYear() !== y ||
      utcDate.getUTCMonth() !== m - 1 ||
      utcDate.getUTCDate() !== d
    ) {
      return null;
    }
    datePart = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
    return null;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  ) {
    return date;
  }
  return null;
}

/**
 * Returns today's local date as a YYYY-MM-DD string.
 */
export function getTodayLocalDateString(refDate = new Date()): string {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, "0");
  const day = String(refDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's local date as a YYYY-MM-DD string.
 */
export function getTomorrowLocalDateString(refDate = new Date()): string {
  const tomorrow = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1);
  return getTodayLocalDateString(tomorrow);
}

export type DueDateUrgency = "overdue" | "today" | "tomorrow" | "upcoming" | "none";

/**
 * Evaluates urgency status for a given YYYY-MM-DD due date relative to today's local date.
 */
export function getDueDateUrgency(
  dueDate?: string,
  todayStr = getTodayLocalDateString()
): DueDateUrgency {
  if (!dueDate || !dueDate.trim()) return "none";

  const parsed = parseLocalDate(dueDate.trim());
  if (!parsed) return "none";

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  const cleanDueDate = `${y}-${m}-${d}`;

  const todayDate = parseLocalDate(todayStr) || new Date();
  const tomorrowStr = getTomorrowLocalDateString(todayDate);

  if (cleanDueDate < todayStr) return "overdue";
  if (cleanDueDate === todayStr) return "today";
  if (cleanDueDate === tomorrowStr) return "tomorrow";
  return "upcoming";
}

/**
 * Formats a YYYY-MM-DD or ISO date string into a user-friendly local format.
 */
export function formatLocalDate(
  dateString?: string,
  locale = "en-US"
): string {
  if (!dateString) return "";
  const date = parseLocalDate(dateString);
  if (!date) return dateString;

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns label and styling metadata for displaying a task's due date.
 */
export function getDueDateDisplay(
  dueDate?: string,
  todayStr = getTodayLocalDateString()
): {
  label: string;
  urgency: DueDateUrgency;
  className: string;
} | null {
  if (!dueDate) return null;

  const urgency = getDueDateUrgency(dueDate, todayStr);
  const formatted = formatLocalDate(dueDate);

  switch (urgency) {
    case "overdue":
      return {
        label: `Overdue (${formatted})`,
        urgency,
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold",
      };
    case "today":
      return {
        label: "Due Today",
        urgency,
        className:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold",
      };
    case "tomorrow":
      return {
        label: "Tomorrow",
        urgency,
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      };
    case "upcoming":
      return {
        label: formatted,
        urgency,
        className:
          "bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200",
      };
    default:
      return null;
  }
}
