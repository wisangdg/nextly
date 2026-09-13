import { createContext } from "react";
import type { Task, TaskCreateInput, TaskUpdateInput } from "../types/Task.ts";
import type { ImportResult } from "../utils/storage.ts";

export interface TaskContextType {
  tasks: Task[];
  addTask: (taskData: TaskCreateInput) => Task | null;
  updateTask: (id: string, taskData: TaskUpdateInput) => boolean;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  getTask: (id: string) => Task | undefined;
  toggleTaskCompletion: (id: string) => void;
  loadSampleTasks: () => void;
  clearAllTasks: () => void;
  exportTasks: () => void;
  importTasks: (jsonString: string) => ImportResult;
  // Storage resilience & recovery
  storageError: string | null;
  isCorrupted: boolean;
  rawCorruptedString?: string;
  loadError?: string;
  isInitialLoadFailed: boolean;
  retryLoadStorage: () => boolean;
  resetCorruptedStorage: () => void;
  downloadRawCorruptedBackup: () => void;
  // Cross-tab synchronization
  hasExternalTabUpdate: boolean;
  syncFromStorage: () => void;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);
