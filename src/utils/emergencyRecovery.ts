import { STORAGE_KEY, createBackupBlob } from "./storage.ts";
import type { NextlyEmergencyRecovery } from "../context/taskCore.ts";
import type { Task } from "../types/Task.ts";

export interface EmergencyBackupData {
  success: boolean;
  filename: string;
  blob?: Blob;
  content?: string;
  inMemoryTasks?: Task[];
  rawCorruptedString?: string;
  error?: string;
}

/**
 * Extracts emergency backup data with strict differentiation between valid empty snapshots,
 * corrupted payloads, and unavailable storage (U01, V01).
 * When both in-memory unsaved tasks and raw corrupted storage exist, exports a composite JSON
 * backup preserving both recovery artifacts (V01).
 */
export function extractEmergencyBackupData(storageGetter?: () => string | null): EmergencyBackupData {
  const g =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : typeof globalThis !== "undefined"
      ? (globalThis as unknown as Record<string, unknown>)
      : undefined;

  const recovery = g?.__nextly_emergency_recovery as NextlyEmergencyRecovery | undefined;
  const inMemoryTasks = g?.__nextly_latest_tasks as Task[] | undefined;
  const dateStr = new Date().toISOString().slice(0, 10);

  // 1. Structured recovery descriptor published by TaskCore
  if (recovery) {
    if (recovery.status === "corrupted") {
      let raw = recovery.rawCorruptedString;
      let storageReadError: string | undefined;

      if (!raw) {
        try {
          const storedRaw = storageGetter ? storageGetter() : localStorage.getItem(STORAGE_KEY);
          if (storedRaw) raw = storedRaw;
        } catch (storageErr) {
          storageReadError = storageErr instanceof Error ? storageErr.message : String(storageErr);
        }
      }

      // V01: If active session has unsaved in-memory tasks AND storage is corrupted,
      // preserve BOTH in a composite JSON emergency backup payload.
      const hasInMemoryTasks = Array.isArray(recovery.tasks) && recovery.tasks.length > 0;

      if (hasInMemoryTasks) {
        const composite = {
          version: 1,
          exportedAt: new Date().toISOString(),
          source: "emergency-recovery-with-corrupted-storage",
          tasks: recovery.tasks,
          rawCorruptedStorage: raw || "",
        };
        const content = JSON.stringify(composite, null, 2);
        return {
          success: true,
          filename: `nextly-emergency-backup-with-corrupted-storage-${dateStr}.json`,
          content,
          blob: createBackupBlob(content),
          inMemoryTasks: recovery.tasks,
          rawCorruptedString: raw || "",
        };
      }

      // If no valid in-memory tasks exist (e.g. startup corruption), export raw corrupted file (.txt)
      if (raw) {
        return {
          success: true,
          filename: `nextly-corrupted-emergency-backup-${dateStr}.txt`,
          content: raw,
          blob: createBackupBlob(raw),
          rawCorruptedString: raw,
        };
      }

      if (storageReadError) {
        return {
          success: false,
          filename: "",
          error: `Corrupted data could not be retrieved from memory or storage: ${storageReadError}`,
        };
      }

      return {
        success: false,
        filename: "",
        error: recovery.error || "Corrupted data payload was empty or unavailable",
      };
    }

    if (recovery.status === "ready" && Array.isArray(recovery.tasks)) {
      const raw = JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          source: "in-memory-emergency-recovery",
          tasks: recovery.tasks,
        },
        null,
        2
      );
      return {
        success: true,
        filename: `nextly-emergency-backup-${dateStr}.json`,
        content: raw,
        blob: createBackupBlob(raw),
        inMemoryTasks: recovery.tasks,
      };
    }

    if (recovery.status === "initial_load_failed") {
      try {
        const storedRaw = storageGetter ? storageGetter() : localStorage.getItem(STORAGE_KEY);
        if (storedRaw !== null && storedRaw !== undefined && storedRaw !== "") {
          return {
            success: true,
            filename: `nextly-emergency-backup-${dateStr}.json`,
            content: storedRaw,
            blob: createBackupBlob(storedRaw),
          };
        }
      } catch (storageErr) {
        return {
          success: false,
          filename: "",
          error: `Storage access failed and initial load was incomplete: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`,
        };
      }
      return {
        success: false,
        filename: "",
        error: `Initial storage load failed: ${recovery.error || "No data could be retrieved"}`,
      };
    }
  }

  // 2. Legacy fallback if __nextly_latest_tasks was set directly
  if (Array.isArray(inMemoryTasks)) {
    const raw = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        source: "in-memory-emergency-recovery",
        tasks: inMemoryTasks,
      },
      null,
      2
    );
    return {
      success: true,
      filename: `nextly-emergency-backup-${dateStr}.json`,
      content: raw,
      blob: createBackupBlob(raw),
      inMemoryTasks: inMemoryTasks,
    };
  }

  // 3. Fallback to localStorage if no in-memory recovery object exists
  try {
    const raw = storageGetter ? storageGetter() : localStorage.getItem(STORAGE_KEY);
    if (raw !== null && raw !== undefined && raw !== "") {
      return {
        success: true,
        filename: `nextly-emergency-backup-${dateStr}.json`,
        content: raw,
        blob: createBackupBlob(raw),
      };
    }
    return {
      success: false,
      filename: "",
      error: "No task data found in browser storage to back up.",
    };
  } catch (storageErr) {
    return {
      success: false,
      filename: "",
      error: `Browser storage is unavailable: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`,
    };
  }
}
