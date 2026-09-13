import { TaskStatus } from "../types/Task.ts";
import type { Task } from "../types/Task.ts";
import { getTodayLocalDateString } from "./dateUtils.ts";

/**
 * Generates an opt-in set of realistic sample tasks with dates relative to today.
 * Demonstrates all urgency buckets (overdue, today, upcoming, no deadline)
 * and priorities for Smart Sort evaluation.
 */
export function generateSampleTasks(): Task[] {
  const now = new Date();
  const nowIso = now.toISOString();

  const getDateRelative = (daysOffset: number): string => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset);
    return getTodayLocalDateString(d);
  };

  return [
    {
      id: "sample-1",
      title: "Fix critical login session timeout",
      description: "Users reported intermittent 401 errors after 15 minutes of inactivity on mobile safari.",
      priority: "high",
      category: "work",
      status: TaskStatus.Active,
      dueDate: getDateRelative(-2), // Overdue
      createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-2",
      title: "Submit Q3 engineering quarterly review",
      description: "Compile OKR completion metrics, reliability scorecard, and budget forecast for director.",
      priority: "high",
      category: "work",
      status: TaskStatus.Active,
      dueDate: getDateRelative(0), // Due Today
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-3",
      title: "Annual health checkup appointment",
      description: "Comprehensive blood panel and consultation with Dr. Aris at Medika Clinic (10:30 AM).",
      priority: "medium",
      category: "health",
      status: TaskStatus.Active,
      dueDate: getDateRelative(0), // Due Today
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-4",
      title: "Design system token synchronization",
      description: "Export Figma variable tokens to Tailwind config and verify contrast ratios.",
      priority: "medium",
      category: "work",
      status: TaskStatus.Active,
      dueDate: getDateRelative(1), // Tomorrow
      createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-5",
      title: "Buy ergonomic keyboard wrist rest",
      description: "Check memory foam vs gel options compatible with compact 75% mechanical keyboard.",
      priority: "low",
      category: "shopping",
      status: TaskStatus.Active,
      dueDate: getDateRelative(3), // Upcoming
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-6",
      title: "Clean and reorganize desk workspace",
      description: "Cable management under the desk, wipe dual monitors, and sort physical notebooks.",
      priority: "low",
      category: "personal",
      status: TaskStatus.Active,
      dueDate: undefined, // No deadline
      createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-7",
      title: "Update security dependencies across repositories",
      description: "Patch high severity advisory on transitive build plugins and run regression suite.",
      priority: "high",
      category: "work",
      status: TaskStatus.Active,
      dueDate: undefined, // High priority, no deadline
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: "sample-8",
      title: "Renew annual domain and SSL certificate",
      description: "Cloudflare registrar renewal confirmed and DNSSEC checked.",
      priority: "medium",
      category: "work",
      status: TaskStatus.Completed,
      dueDate: getDateRelative(-3),
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
      completedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
    },
  ];
}
