import { TaskStatus } from "../types/Task.ts";
import type { Task, Priority, Category, StoragePayload } from "../types/Task.ts";
import { parseLocalDate } from "./dateUtils.ts";

export const STORAGE_KEY = "tasks";
export const STORAGE_VERSION = 1;
export const SUPPORTED_STORAGE_VERSIONS = [1];

export const VALID_PRIORITIES: Priority[] = ["low", "medium", "high"];
export const VALID_CATEGORIES: Category[] = [
  "work",
  "personal",
  "shopping",
  "health",
  "other",
];

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  errors: string[];
}

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

export function isValidIsoDate(str: unknown): boolean {
  if (typeof str !== "string") return false;
  const match = ISO_DATE_REGEX.exec(str);
  if (!match) return false;

  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);

  if (m < 1 || m > 12 || d < 1 || d > 31) return false;

  // Use Date.UTC to verify that month/day did not rollover (e.g., Feb 31 or Feb 29 non-leap)
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  if (
    utcDate.getUTCFullYear() !== y ||
    utcDate.getUTCMonth() !== m - 1 ||
    utcDate.getUTCDate() !== d
  ) {
    return false;
  }

  return !isNaN(Date.parse(str));
}

/**
 * Validates whether an unknown item is a well-formed Task object.
 */
export function validateTask(item: unknown): ValidationResult<Task> {
  const errors: string[] = [];
  if (!item || typeof item !== "object") {
    return { isValid: false, errors: ["Task item must be an object"] };
  }

  const candidate = item as Record<string, unknown>;

  // id validation
  if (typeof candidate.id !== "string" || !candidate.id.trim()) {
    errors.push("Missing or invalid task ID");
  }

  // title validation
  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    errors.push("Title is required and must not be empty");
  } else if (candidate.title.trim().length > MAX_TITLE_LENGTH) {
    errors.push(`Title must not exceed ${MAX_TITLE_LENGTH} characters`);
  }

  // description validation
  const description =
    typeof candidate.description === "string" ? candidate.description : "";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  // priority validation
  if (
    !candidate.priority ||
    !VALID_PRIORITIES.includes(candidate.priority as Priority)
  ) {
    errors.push("Invalid priority. Must be low, medium, or high");
  }

  // category validation
  if (
    !candidate.category ||
    !VALID_CATEGORIES.includes(candidate.category as Category)
  ) {
    errors.push("Invalid category");
  }

  // status validation
  if (
    candidate.status !== TaskStatus.Active &&
    candidate.status !== TaskStatus.Completed
  ) {
    errors.push("Invalid status. Must be active or completed");
  }

  // createdAt validation
  if (!isValidIsoDate(candidate.createdAt)) {
    errors.push("Invalid createdAt ISO date (must be a valid ISO 8601 timestamp)");
  }

  // updatedAt validation
  if (!isValidIsoDate(candidate.updatedAt)) {
    errors.push("Invalid updatedAt ISO date (must be a valid ISO 8601 timestamp)");
  }

  // dueDate validation (optional, must be genuine calendar date)
  let dueDate: string | undefined = undefined;
  if (candidate.dueDate !== undefined && candidate.dueDate !== null && candidate.dueDate !== "") {
    if (typeof candidate.dueDate === "string") {
      const parsed = parseLocalDate(candidate.dueDate);
      if (parsed) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        dueDate = `${y}-${m}-${d}`;
      } else {
        errors.push("Invalid dueDate calendar date (must be a valid YYYY-MM-DD)");
      }
    } else {
      errors.push("Invalid dueDate format (must be YYYY-MM-DD)");
    }
  }

  // completedAt validation (optional, but if present, MUST be a valid ISO 8601 timestamp)
  let completedAt: string | undefined = undefined;
  if (candidate.completedAt !== undefined && candidate.completedAt !== null && candidate.completedAt !== "") {
    if (isValidIsoDate(candidate.completedAt)) {
      completedAt = String(candidate.completedAt);
    } else {
      errors.push("Invalid completedAt ISO timestamp (must be a valid ISO 8601 timestamp)");
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const validTask: Task = {
    id: String(candidate.id),
    title: String(candidate.title).trim(),
    description,
    priority: candidate.priority as Priority,
    category: candidate.category as Category,
    status: candidate.status as TaskStatus,
    createdAt: String(candidate.createdAt),
    updatedAt: String(candidate.updatedAt),
    dueDate,
    completedAt,
  };

  return { isValid: true, value: validTask, errors: [] };
}

export interface StorageLoadResult {
  tasks: Task[];
  isCorrupted: boolean;
  rawCorruptedString?: string;
  loadError?: string;
}

/**
 * Safely loads tasks from storage, migrating legacy formats and protecting corrupt data.
 */
export function loadTasksFromStorage(): StorageLoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return {
      tasks: [],
      isCorrupted: false,
      loadError: `Unable to access local storage: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (!raw || !raw.trim()) {
    return { tasks: [], isCorrupted: false };
  }

  try {
    const parsed = JSON.parse(raw);

    // Support both Version 1 payload format and legacy array format
    let rawList: unknown[] = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as StoragePayload).tasks)
    ) {
      const version = (parsed as StoragePayload).version;
      if (typeof version !== "number" || !SUPPORTED_STORAGE_VERSIONS.includes(version)) {
        return {
          tasks: [],
          isCorrupted: true,
          rawCorruptedString: raw,
          loadError: `Unsupported storage version: ${version}. Supported versions: ${SUPPORTED_STORAGE_VERSIONS.join(", ")}`,
        };
      }
      rawList = (parsed as StoragePayload).tasks;
    } else {
      // JSON is valid but not an array or storage payload
      return {
        tasks: [],
        isCorrupted: true,
        rawCorruptedString: raw,
        loadError: "Storage data format is invalid (not a valid task list).",
      };
    }

    const validTasks: Task[] = [];
    const corruptItems: unknown[] = [];
    const seenIds = new Set<string>();

    for (const item of rawList) {
      const result = validateTask(item);
      if (result.isValid && result.value) {
        if (seenIds.has(result.value.id)) {
          corruptItems.push({
            item,
            error: `Duplicate task ID: ${result.value.id}`,
          });
        } else {
          seenIds.add(result.value.id);
          validTasks.push(result.value);
        }
      } else {
        corruptItems.push(item);
      }
    }

    // If any items are corrupt or duplicate IDs detected, preserve raw corrupted payload
    if (corruptItems.length > 0) {
      return {
        tasks: validTasks,
        isCorrupted: true,
        rawCorruptedString: raw,
        loadError: `Stored tasks contained ${corruptItems.length} invalid or duplicate item(s).`,
      };
    }

    return {
      tasks: validTasks,
      isCorrupted: false,
    };
  } catch {
    // JSON parse error - PRESERVE corrupted string! Do not overwrite.
    return {
      tasks: [],
      isCorrupted: true,
      rawCorruptedString: raw,
      loadError: "Failed to parse JSON stored in localStorage.",
    };
  }
}

/**
 * Safely writes tasks to storage using the versioned envelope schema.
 */
export function saveTasksToStorage(tasks: Task[]): { success: boolean; error?: string } {
  try {
    const payload: StoragePayload = {
      version: STORAGE_VERSION,
      tasks,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to persist to localStorage",
    };
  }
}

/**
 * Creates a downloadable raw backup blob for recovery.
 */
export function createBackupBlob(data: string): Blob {
  return new Blob([data], { type: "application/json" });
}

/**
 * Prepares JSON string for user export.
 */
export function exportTasksToJson(tasks: Task[]): string {
  const payload: StoragePayload = {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
  };
  return JSON.stringify(payload, null, 2);
}

export interface ImportResult {
  success: boolean;
  /**
   * Indicates whether the imported tasks were successfully written to browser storage.
   * false if changes were kept in memory only due to storage quota/failure.
   */
  persisted?: boolean;
  importedCount: number;
  skippedDuplicateCount: number;
  newTasks: Task[];
  error?: string;
}

/**
 * Imports and merges tasks from JSON string with strict validation and atomic failure.
 */
export function importTasksFromJson(
  jsonString: string,
  existingTasks: Task[]
): ImportResult {
  const byteLength = new TextEncoder().encode(jsonString).length;
  if (byteLength > MAX_IMPORT_SIZE_BYTES) {
    return {
      success: false,
      importedCount: 0,
      skippedDuplicateCount: 0,
      newTasks: existingTasks,
      error: "File is too large (maximum allowed size is 2MB)",
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    let items: unknown[] = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as StoragePayload).tasks)
    ) {
      const version = (parsed as StoragePayload).version;
      if (typeof version !== "number" || !SUPPORTED_STORAGE_VERSIONS.includes(version)) {
        return {
          success: false,
          importedCount: 0,
          skippedDuplicateCount: 0,
          newTasks: existingTasks,
          error: `Unsupported storage version: ${version}. Supported versions: ${SUPPORTED_STORAGE_VERSIONS.join(", ")}`,
        };
      }
      items = (parsed as StoragePayload).tasks;
    } else {
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        newTasks: existingTasks,
        error: "Invalid file format. Must contain a task list or Nextly export.",
      };
    }

    const existingIds = new Set(existingTasks.map((t) => t.id));
    const toAdd: Task[] = [];
    let skipped = 0;
    const invalidErrors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const res = validateTask(item);
      if (!res.isValid || !res.value) {
        invalidErrors.push(`Item #${i + 1}: ${res.errors.join(", ")}`);
        continue;
      }
      if (existingIds.has(res.value.id)) {
        skipped++;
      } else {
        existingIds.add(res.value.id);
        toAdd.push(res.value);
      }
    }

    // Atomic rejection: do not partially import if items are corrupt
    if (invalidErrors.length > 0) {
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        newTasks: existingTasks,
        error: `Import rejected: found ${invalidErrors.length} invalid item(s):\n${invalidErrors.slice(0, 3).join("\n")}`,
      };
    }

    if (toAdd.length === 0 && skipped === 0) {
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        newTasks: existingTasks,
        error: "No tasks found in the file to import.",
      };
    }

    const merged = [...existingTasks, ...toAdd];
    return {
      success: true,
      importedCount: toAdd.length,
      skippedDuplicateCount: skipped,
      newTasks: merged,
    };
  } catch (e) {
    return {
      success: false,
      importedCount: 0,
      skippedDuplicateCount: 0,
      newTasks: existingTasks,
      error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
