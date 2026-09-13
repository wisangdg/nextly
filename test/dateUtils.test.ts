import { test, describe } from "node:test";
import assert from "node:assert";
import {
  parseLocalDate,
  getTodayLocalDateString,
  getTomorrowLocalDateString,
  getDueDateUrgency,
  formatLocalDate,
  getDueDateDisplay,
} from "../src/utils/dateUtils.ts";

describe("dateUtils", () => {
  test("parseLocalDate parses YYYY-MM-DD into local midnight date", () => {
    const d = parseLocalDate("2026-09-12");
    assert.ok(d !== null);
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 8); // 0-indexed: 8 = September
    assert.strictEqual(d.getDate(), 12);
  });

  test("parseLocalDate returns null for invalid formats", () => {
    assert.strictEqual(parseLocalDate(""), null);
    assert.strictEqual(parseLocalDate("invalid-date"), null);
    assert.strictEqual(parseLocalDate("2026-02-31"), null);
  });

  test("getTodayLocalDateString formats correctly", () => {
    const fixed = new Date(2026, 8, 12); // Sep 12, 2026
    assert.strictEqual(getTodayLocalDateString(fixed), "2026-09-12");
  });

  test("getTomorrowLocalDateString formats correctly", () => {
    const fixed = new Date(2026, 8, 12);
    assert.strictEqual(getTomorrowLocalDateString(fixed), "2026-09-13");
  });

  test("getDueDateUrgency correctly categorizes overdue, today, tomorrow, upcoming, none", () => {
    const today = "2026-09-12";
    assert.strictEqual(getDueDateUrgency(undefined, today), "none");
    assert.strictEqual(getDueDateUrgency("", today), "none");
    assert.strictEqual(getDueDateUrgency("2026-09-10", today), "overdue");
    assert.strictEqual(getDueDateUrgency("2026-09-11", today), "overdue");
    assert.strictEqual(getDueDateUrgency("2026-09-12", today), "today");
    assert.strictEqual(getDueDateUrgency("2026-09-13", today), "tomorrow");
    assert.strictEqual(getDueDateUrgency("2026-09-15", today), "upcoming");
  });

  test("formatLocalDate formats date reliably", () => {
    const formatted = formatLocalDate("2026-09-12", "en-US");
    assert.ok(formatted.includes("Sep 12, 2026") || formatted.includes("September 12, 2026"));
  });

  test("getDueDateDisplay provides metadata label and styling for each urgency state", () => {
    const today = "2026-09-12";
    assert.strictEqual(getDueDateDisplay(undefined, today), null);
    assert.strictEqual(getDueDateDisplay("", today), null);

    const overdue = getDueDateDisplay("2026-09-10", today);
    assert.strictEqual(overdue?.urgency, "overdue");
    assert.ok(overdue?.label.includes("Overdue"));

    const dueToday = getDueDateDisplay("2026-09-12", today);
    assert.strictEqual(dueToday?.urgency, "today");
    assert.strictEqual(dueToday?.label, "Due Today");

    const tomorrow = getDueDateDisplay("2026-09-13", today);
    assert.strictEqual(tomorrow?.urgency, "tomorrow");
    assert.strictEqual(tomorrow?.label, "Tomorrow");

    const upcoming = getDueDateDisplay("2026-09-20", today);
    assert.strictEqual(upcoming?.urgency, "upcoming");
    assert.ok(!upcoming?.label.includes("Overdue") && !upcoming?.label.includes("Today"));
  });
});
