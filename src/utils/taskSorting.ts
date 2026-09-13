import { TaskStatus } from "../types/Task.ts";
import type { Task, Priority } from "../types/Task.ts";
import { getDueDateUrgency, formatLocalDate, getTodayLocalDateString } from "./dateUtils.ts";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const URGENCY_WEIGHT: Record<string, number> = {
  overdue: 4,
  today: 3,
  upcoming: 2,
  tomorrow: 2,
  none: 1,
};

/**
 * Generates an explainable reason string for why a task is positioned where it is.
 */
export function getSmartSortReason(
  task: Task,
  todayStr = getTodayLocalDateString()
): string {
  if (task.status === TaskStatus.Completed) {
    return "Completed";
  }

  const urgency = getDueDateUrgency(task.dueDate, todayStr);
  const priorityStr = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  switch (urgency) {
    case "overdue":
      return `Overdue · ${priorityStr} priority`;
    case "today":
      return `Due today · ${priorityStr} priority`;
    case "tomorrow":
      return `Due tomorrow · ${priorityStr} priority`;
    case "upcoming":
      return `Due ${formatLocalDate(task.dueDate)} · ${priorityStr} priority`;
    case "none":
    default:
      return `No deadline · ${priorityStr} priority`;
  }
}

/**
 * Deterministic Smart Sort comparator:
 * 1. Active before Completed.
 * 2. Active urgency: Overdue -> Due today -> Upcoming -> No deadline.
 * 3. Priority: High -> Medium -> Low.
 * 4. Due Date: Nearest deadline first.
 * 5. Created Date: Older tasks first (first-in backlog).
 * 6. ID as final stable tie-breaker.
 */
export function compareSmartSort(
  a: Task,
  b: Task,
  todayStr = getTodayLocalDateString()
): number {
  // 1. Status: Active before Completed
  if (a.status !== b.status) {
    return a.status === TaskStatus.Active ? -1 : 1;
  }

  // If both are completed, sort deterministically (newest completed first, then ID)
  if (a.status === TaskStatus.Completed) {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.updatedAt).getTime();
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.updatedAt).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  }

  // 2. Urgency group
  const aUrgency = getDueDateUrgency(a.dueDate, todayStr);
  const bUrgency = getDueDateUrgency(b.dueDate, todayStr);
  const urgencyDiff = (URGENCY_WEIGHT[bUrgency] || 0) - (URGENCY_WEIGHT[aUrgency] || 0);
  if (urgencyDiff !== 0) return urgencyDiff;

  // 3. Priority: High > Medium > Low
  const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  // 4. Due date (closest date first)
  if (a.dueDate && b.dueDate) {
    const diff = a.dueDate.localeCompare(b.dueDate);
    if (diff !== 0) return diff;
  } else if (a.dueDate && !b.dueDate) {
    return -1;
  } else if (!a.dueDate && b.dueDate) {
    return 1;
  }

  // 5. Creation date: older first for active tasks
  const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (createdDiff !== 0) return createdDiff;

  // 6. Tie breaker
  return a.id.localeCompare(b.id);
}

/**
 * Due Date comparator fixing the F03 bug where both empty dates returned 1.
 */
export function compareDueDate(a: Task, b: Task): number {
  if (a.status !== b.status) {
    return a.status === TaskStatus.Active ? -1 : 1;
  }

  if (!a.dueDate && !b.dueDate) {
    // Both without due date: tie break by createdAt then ID
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  }
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;

  const diff = a.dueDate.localeCompare(b.dueDate);
  if (diff !== 0) return diff;

  return a.id.localeCompare(b.id);
}

export function comparePriority(a: Task, b: Task): number {
  if (a.status !== b.status) {
    return a.status === TaskStatus.Active ? -1 : 1;
  }
  const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (diff !== 0) return diff;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || a.id.localeCompare(b.id);
}

export function compareNewest(a: Task, b: Task): number {
  if (a.status !== b.status) {
    return a.status === TaskStatus.Active ? -1 : 1;
  }
  const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}

export type SortOption = "smart" | "dueDate" | "priority" | "newest";

/**
 * Returns a new sorted array of tasks without mutating the original array.
 */
export function sortTasks(
  tasks: Task[],
  sortBy: SortOption | string = "smart",
  todayStr = getTodayLocalDateString()
): Task[] {
  const cloned = [...tasks];

  switch (sortBy) {
    case "dueDate":
      return cloned.sort(compareDueDate);
    case "priority":
      return cloned.sort(comparePriority);
    case "newest":
      return cloned.sort(compareNewest);
    case "smart":
    default:
      return cloned.sort((a, b) => compareSmartSort(a, b, todayStr));
  }
}
