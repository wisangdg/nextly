/**
 * Utility for generating unique task IDs.
 * Uses native crypto.randomUUID() when available (modern browsers & Node 16.7+),
 * with a collision-resistant timestamp + random fallback.
 */
export function generateTaskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
