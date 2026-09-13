import type { Task, TaskCreateInput, TaskUpdateInput } from "../types/Task.ts";
import { TaskStatus } from "../types/Task.ts";
import { generateTaskId } from "../utils/id.ts";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  createBackupBlob,
  exportTasksToJson,
  importTasksFromJson,
  validateTask,
  STORAGE_KEY,
} from "../utils/storage.ts";
import type { StorageLoadResult, ImportResult } from "../utils/storage.ts";
import { generateSampleTasks } from "../utils/sampleData.ts";

export type EmergencyRecoveryStatus = "ready" | "corrupted" | "initial_load_failed";

export interface NextlyEmergencyRecovery {
  status: EmergencyRecoveryStatus;
  tasks?: Task[];
  rawCorruptedString?: string;
  error?: string;
}

export interface TaskWriteLockState {
  isCorrupted: boolean;
  isInitialLoadFailed: boolean;
  hasExternalTabUpdate: boolean;
}

export interface TaskCoreListeners {
  onStateChange?: () => void;
  onToastSuccess?: (message: string) => void;
  onToastError?: (message: string) => void;
  onToastInfo?: (message: string) => void;
  onToastUndo?: (task: Task, onUndo: () => void) => void;
  onConfirm?: (message: string) => boolean;
}

/**
 * TaskCore: Centralized production controller for Nextly state,
 * write locks, storage persistence, and atomic mutation guarantees.
 * Used by TaskProvider in UI and directly exercised in integration tests.
 */
export class TaskCore {
  private _tasks: Task[];
  private _isCorrupted: boolean;
  private _rawCorruptedString?: string;
  private _loadError?: string;
  private _isInitialLoadFailed: boolean;
  private _storageError: string | null = null;
  private _hasExternalTabUpdate: boolean = false;

  // Single mutable reference for write locks (T01)
  public readonly writeLockRef: { current: TaskWriteLockState };
  // Single mutable reference for current tasks (S02)
  public readonly tasksRef: { current: Task[] };

  private listeners: TaskCoreListeners;

  constructor(initialResult?: StorageLoadResult, listeners: TaskCoreListeners = {}) {
    this.listeners = listeners;
    const res = initialResult || loadTasksFromStorage();

    this._tasks = res.tasks;
    this._isCorrupted = res.isCorrupted;
    this._rawCorruptedString = res.rawCorruptedString;
    this._loadError = res.loadError;
    this._isInitialLoadFailed = Boolean(res.loadError && !res.isCorrupted);

    this.writeLockRef = {
      current: {
        isCorrupted: this._isCorrupted,
        isInitialLoadFailed: this._isInitialLoadFailed,
        hasExternalTabUpdate: false,
      },
    };

    this.tasksRef = {
      current: this._tasks,
    };

    this.syncEmergencyWindowRef();
  }

  public get tasks(): Task[] {
    return this._tasks;
  }

  public get isCorrupted(): boolean {
    return this._isCorrupted;
  }

  public get rawCorruptedString(): string | undefined {
    return this._rawCorruptedString;
  }

  public get loadError(): string | undefined {
    return this._loadError;
  }

  public get isInitialLoadFailed(): boolean {
    return this._isInitialLoadFailed;
  }

  public get storageError(): string | null {
    return this._storageError;
  }

  public get hasExternalTabUpdate(): boolean {
    return this._hasExternalTabUpdate;
  }

  /**
   * Synchronizes latest in-memory tasks or corruption/recovery state to global emergency recovery ref (U01, S09, T02)
   */
  private syncEmergencyWindowRef(): void {
    let recovery: NextlyEmergencyRecovery;

    if (this._isCorrupted) {
      recovery = {
        status: "corrupted",
        rawCorruptedString: this._rawCorruptedString,
        tasks: this._tasks && this._tasks.length > 0 ? this._tasks : undefined,
        error: this._loadError || "Storage contains corrupted or unparsable data",
      };
    } else if (this._isInitialLoadFailed) {
      recovery = {
        status: "initial_load_failed",
        error: this._loadError || "Initial storage read failed",
      };
    } else {
      recovery = {
        status: "ready",
        tasks: this._tasks,
      };
    }

    const g =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>)
        : typeof globalThis !== "undefined"
        ? (globalThis as unknown as Record<string, unknown>)
        : undefined;

    if (g) {
      g.__nextly_emergency_recovery = recovery;
      if (recovery.status === "ready" || (recovery.status === "corrupted" && recovery.tasks && recovery.tasks.length > 0)) {
        g.__nextly_latest_tasks = this._tasks;
      } else {
        delete g.__nextly_latest_tasks;
      }
    }
  }

  /**
   * Checks current write lock state at call time (T01)
   */
  public getWriteLockError(): string | null {
    if (this.writeLockRef.current.isCorrupted) {
      return "Cannot write to storage while data is corrupted. Please resolve recovery first.";
    }
    if (this.writeLockRef.current.isInitialLoadFailed) {
      return "Cannot write to storage: Initial storage read failed. Please retry loading storage or export a backup.";
    }
    if (this.writeLockRef.current.hasExternalTabUpdate) {
      return "Storage was modified by another tab or window. Please sync changes before saving new edits.";
    }
    return null;
  }

  /**
   * Centralized persistence helper: saves directly, handles errors, updates refs
   */
  public persistAndCommit = (newTasks: Task[]): boolean => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.listeners.onToastError?.(lockError);
      return false;
    }

    // Always update in-memory tasksRef and global emergency snapshot (S02, S09, T02)
    this.tasksRef.current = newTasks;
    this._tasks = newTasks;
    this.syncEmergencyWindowRef();

    const saveResult = saveTasksToStorage(newTasks);
    if (!saveResult.success) {
      const errMsg = saveResult.error || "Failed to persist to local storage";
      this._storageError = errMsg;
      this.listeners.onToastError?.("Storage write failed: changes kept in memory only. Please export a backup.");
      this.listeners.onStateChange?.();
      return false;
    } else {
      this._storageError = null;
      this.listeners.onStateChange?.();
      return true;
    }
  };

  /**
   * External storage event handler: handles key changes and external clear (T07)
   */
  public handleStorageEvent = (key: string | null): void => {
    // T07: localStorage.clear() sends key === null in Web Storage spec
    if (key === STORAGE_KEY || key === null) {
      this._hasExternalTabUpdate = true;
      this.writeLockRef.current.hasExternalTabUpdate = true;
      this.listeners.onStateChange?.();
    }
  };

  /**
   * Retries loading storage after initial read failure (S03)
   */
  public retryLoadStorage = (): boolean => {
    const fresh = loadTasksFromStorage();
    if (fresh.isCorrupted) {
      this._isCorrupted = true;
      this._rawCorruptedString = fresh.rawCorruptedString;
      this._loadError = fresh.loadError;
      this._isInitialLoadFailed = false;
      this.writeLockRef.current.isCorrupted = true;
      this.writeLockRef.current.isInitialLoadFailed = false;
      this.syncEmergencyWindowRef();
      this.listeners.onToastError?.("Corrupted storage detected during retry. Recovery write lock enabled.");
      this.listeners.onStateChange?.();
      return false;
    }

    if (fresh.loadError) {
      this._loadError = fresh.loadError;
      this._isInitialLoadFailed = true;
      this.writeLockRef.current.isInitialLoadFailed = true;
      this.syncEmergencyWindowRef();
      this.listeners.onToastError?.(`Retry failed: ${fresh.loadError}`);
      this.listeners.onStateChange?.();
      return false;
    }

    this.tasksRef.current = fresh.tasks;
    this._tasks = fresh.tasks;
    this._isInitialLoadFailed = false;
    this._loadError = undefined;
    this._storageError = null;
    this.writeLockRef.current.isInitialLoadFailed = false;
    this.syncEmergencyWindowRef();
    this.listeners.onToastSuccess?.("Storage loaded successfully!");
    this.listeners.onStateChange?.();
    return true;
  };

  /**
   * Safely synchronizes from storage with corruption-first checks (S01) and unsaved protection (S04)
   */
  public syncFromStorage = (customConfirm?: () => boolean): boolean => {
    const fresh = loadTasksFromStorage();

    if (fresh.isCorrupted) {
      this._isCorrupted = true;
      this._rawCorruptedString = fresh.rawCorruptedString;
      this._loadError = fresh.loadError;
      this._isInitialLoadFailed = false;
      this.writeLockRef.current.isCorrupted = true;
      this.writeLockRef.current.isInitialLoadFailed = false;
      this.syncEmergencyWindowRef();
      this.listeners.onToastError?.(
        "External storage contains corrupted data. Write lock enabled to protect raw data; in-memory tasks preserved."
      );
      this.listeners.onStateChange?.();
      return false;
    }

    if (fresh.loadError) {
      this.listeners.onToastError?.(`Sync aborted: ${fresh.loadError}`);
      return false;
    }

    if (this._storageError) {
      const confirmFn = customConfirm || this.listeners.onConfirm;
      const confirmed = confirmFn
        ? confirmFn(
            "You have unsaved in-memory changes that failed to write to browser storage. Syncing will replace them with storage data.\n\nDo you wish to discard unsaved changes and sync?"
          )
        : true;
      if (!confirmed) {
        this.listeners.onToastInfo?.("Sync cancelled. Unsaved changes kept in memory.");
        return false;
      }
    }

    this.tasksRef.current = fresh.tasks;
    this._tasks = fresh.tasks;
    this._isCorrupted = false;
    this._rawCorruptedString = undefined;
    this._loadError = undefined;
    this._isInitialLoadFailed = false;
    this._storageError = null;
    this._hasExternalTabUpdate = false;
    this.writeLockRef.current.isCorrupted = false;
    this.writeLockRef.current.isInitialLoadFailed = false;
    this.writeLockRef.current.hasExternalTabUpdate = false;
    this.syncEmergencyWindowRef();
    this.listeners.onToastSuccess?.("Tasks synchronized from storage!");
    this.listeners.onStateChange?.();
    return true;
  };

  /**
   * Adds a new task using tasksRef.current to prevent rapid-click clobbering (S02)
   */
  public addTask = (taskData: TaskCreateInput): Task | null => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.persistAndCommit(this.tasksRef.current);
      return null;
    }

    const now = new Date().toISOString();
    const newTaskCandidate: Task = {
      id: generateTaskId(),
      title: taskData.title.trim(),
      description: taskData.description || "",
      category: taskData.category || "other",
      priority: taskData.priority || "medium",
      status: taskData.status || TaskStatus.Active,
      dueDate: taskData.dueDate || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const validation = validateTask(newTaskCandidate);
    if (!validation.isValid) {
      this.listeners.onToastError?.(validation.errors[0] || "Invalid task data");
      return null;
    }

    const newTask = validation.value!;
    const nextTasks = [newTask, ...this.tasksRef.current];
    const saved = this.persistAndCommit(nextTasks);
    if (saved) {
      this.listeners.onToastSuccess?.("Task added successfully!");
    }
    return newTask;
  };

  /**
   * Updates an existing task with pure synchronous validation (R04/R05)
   */
  public updateTask = (id: string, updates: TaskUpdateInput): boolean => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.persistAndCommit(this.tasksRef.current);
      return false;
    }

    const currentTasks = this.tasksRef.current;
    const target = currentTasks.find((t) => t.id === id);
    if (!target) {
      this.listeners.onToastError?.("Task not found");
      return false;
    }

    const now = new Date().toISOString();
    const nextStatus = updates.status !== undefined ? updates.status : target.status;
    let completedAt = target.completedAt;

    if (nextStatus === TaskStatus.Completed && target.status !== TaskStatus.Completed) {
      completedAt = now;
    } else if (nextStatus === TaskStatus.Active && target.status === TaskStatus.Completed) {
      completedAt = undefined;
    }

    let nextDueDate: string | undefined = target.dueDate;
    if (updates.dueDate === null || updates.dueDate === "") {
      nextDueDate = undefined;
    } else if (typeof updates.dueDate === "string") {
      nextDueDate = updates.dueDate;
    }

    const candidate: Task = {
      ...target,
      ...updates,
      dueDate: nextDueDate,
      status: nextStatus,
      completedAt,
      updatedAt: now,
    };

    const val = validateTask(candidate);
    if (!val.isValid) {
      this.listeners.onToastError?.(val.errors[0] || "Invalid updates");
      return false;
    }

    const nextTasks = currentTasks.map((t) => (t.id === id ? val.value! : t));
    const saved = this.persistAndCommit(nextTasks);
    if (saved) {
      this.listeners.onToastSuccess?.("Task updated!");
    }
    return saved;
  };

  /**
   * Restores a specific task for Undo, checking locks dynamically at call time (T01 & S05)
   */
  public restoreSpecificTask = (taskToRestore: Task, originalIndex: number): boolean => {
    // T01: Always inspect the latest synchronous write lock state AT CALL TIME
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.listeners.onToastError?.(lockError);
      return false;
    }

    const current = this.tasksRef.current;
    if (current.some((t) => t.id === taskToRestore.id)) {
      this.listeners.onToastError?.("Task already exists in workspace.");
      return false;
    }

    const copy = [...current];
    const insertIndex = Math.min(originalIndex, copy.length);
    copy.splice(insertIndex, 0, taskToRestore);
    const saved = this.persistAndCommit(copy);
    if (saved) {
      this.listeners.onToastSuccess?.(`Task restored: ${taskToRestore.title}`);
      return true;
    }
    return false;
  };

  /**
   * Deletes a task and emits an undo action closure bound to the exact task and index (R06 & T01)
   */
  public deleteTask = (id: string): Task | null => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.persistAndCommit(this.tasksRef.current);
      return null;
    }

    const currentTasks = this.tasksRef.current;
    const targetIndex = currentTasks.findIndex((t) => t.id === id);
    const targetTask = currentTasks[targetIndex];
    if (!targetTask) return null;

    const nextTasks = currentTasks.filter((t) => t.id !== id);
    const saved = this.persistAndCommit(nextTasks);

    if (saved) {
      // Create the undo action bound to targetTask, checking locks dynamically AT CALL TIME (T01)
      const onUndo = () => {
        this.restoreSpecificTask(targetTask, targetIndex);
      };

      this.listeners.onToastUndo?.(targetTask, onUndo);
      return targetTask;
    }
    return null;
  };

  public getTask = (id: string): Task | undefined => {
    return this.tasksRef.current.find((t) => t.id === id);
  };

  public toggleTaskCompletion = (id: string): boolean => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.persistAndCommit(this.tasksRef.current);
      return false;
    }

    const currentTasks = this.tasksRef.current;
    const target = currentTasks.find((t) => t.id === id);
    if (!target) return false;

    const isCompleting = target.status !== TaskStatus.Completed;
    const now = new Date().toISOString();

    const nextTasks = currentTasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status: isCompleting ? TaskStatus.Completed : TaskStatus.Active,
            completedAt: isCompleting ? now : undefined,
            updatedAt: now,
          }
        : t
    );

    const saved = this.persistAndCommit(nextTasks);
    if (saved) {
      this.listeners.onToastSuccess?.(isCompleting ? "Task completed!" : "Task marked as active");
      return true;
    }
    return false;
  };

  public loadSampleTasks = (customConfirm?: () => boolean): boolean => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.persistAndCommit(this.tasksRef.current);
      return false;
    }

    if (this.tasksRef.current.length > 0) {
      const confirmFn = customConfirm || this.listeners.onConfirm;
      const confirmed = confirmFn
        ? confirmFn(
            "Loading sample tasks will replace your current workspace tasks. Make sure to export a backup if you want to keep them.\n\nDo you wish to replace with sample tasks?"
          )
        : true;
      if (!confirmed) return false;
    }

    const samples = generateSampleTasks();
    const saved = this.persistAndCommit(samples);
    if (saved) {
      this.listeners.onToastSuccess?.("Loaded sample workspace with 8 tasks!");
      return true;
    }
    return false;
  };

  public clearAllTasks = (customConfirm?: () => boolean): boolean => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.persistAndCommit(this.tasksRef.current);
      return false;
    }

    if (this.tasksRef.current.length === 0) return false;

    const confirmFn = customConfirm || this.listeners.onConfirm;
    const confirmed = confirmFn
      ? confirmFn("Are you sure you want to delete all tasks? This cannot be undone.")
      : true;
    if (!confirmed) return false;

    const saved = this.persistAndCommit([]);
    if (saved) {
      this.listeners.onToastSuccess?.("All tasks cleared.");
      return true;
    }
    return false;
  };

  public exportTasks = (): string => {
    const jsonString = exportTasksToJson(this.tasksRef.current);
    if (typeof document !== "undefined") {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nextly-tasks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.listeners.onToastSuccess?.("Tasks exported to JSON!");
    return jsonString;
  };

  /**
   * Imports tasks from JSON string with strict validation and persistence verification (T04)
   */
  public importTasks = (jsonString: string): ImportResult => {
    const lockError = this.getWriteLockError();
    if (lockError) {
      this.listeners.onToastError?.(lockError);
      return {
        success: false,
        persisted: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        newTasks: this.tasksRef.current,
        error: lockError,
      };
    }

    const res = importTasksFromJson(jsonString, this.tasksRef.current);
    if (res.success) {
      const saved = this.persistAndCommit(res.newTasks);
      if (saved) {
        this.listeners.onToastSuccess?.(
          `Imported ${res.importedCount} task(s)${
            res.skippedDuplicateCount > 0 ? ` (${res.skippedDuplicateCount} duplicates skipped)` : ""
          }`
        );
        return {
          ...res,
          success: true,
          persisted: true,
        };
      } else {
        // T04: Distinguish memory-only import when persistence fails
        const storageErrMsg = this._storageError || "Failed to persist to local storage";
        return {
          ...res,
          success: false,
          persisted: false,
          error: `Imported into memory only: ${storageErrMsg}`,
        };
      }
    } else {
      this.listeners.onToastError?.(res.error || "Failed to import tasks");
      return {
        ...res,
        persisted: false,
      };
    }
  };

  /**
   * Resets corrupted storage safely, preserving raw backup on write failure (S06)
   */
  public resetCorruptedStorage = (customConfirm?: () => boolean): boolean => {
    const confirmFn = customConfirm || this.listeners.onConfirm;
    const confirmed = confirmFn
      ? confirmFn(
          "Are you sure you want to reset corrupted storage? All unrecoverable data will be permanently cleared from this browser. Ensure you have downloaded a raw backup if needed.\n\nProceed with reset?"
        )
      : true;

    if (!confirmed) return false;

    const saveResult = saveTasksToStorage([]);
    if (!saveResult.success) {
      this.listeners.onToastError?.(
        `Failed to reset storage in browser: ${saveResult.error || "Could not write to local storage"}. Raw backup is preserved.`
      );
      return false;
    }

    this._isCorrupted = false;
    this._rawCorruptedString = undefined;
    this._loadError = undefined;
    this._isInitialLoadFailed = false;
    this._storageError = null;
    this.writeLockRef.current.isCorrupted = false;
    this.writeLockRef.current.isInitialLoadFailed = false;

    this.tasksRef.current = [];
    this._tasks = [];
    this.syncEmergencyWindowRef();
    this.listeners.onToastSuccess?.("Storage reset successfully. Workspace is clean.");
    this.listeners.onStateChange?.();
    return true;
  };

  public downloadRawCorruptedBackup = (): void => {
    if (!this._rawCorruptedString || typeof document === "undefined") return;
    const blob = createBackupBlob(this._rawCorruptedString);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nextly-corrupted-backup-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
