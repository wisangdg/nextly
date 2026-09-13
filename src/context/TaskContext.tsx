import React, { useState, useEffect, useCallback, useRef } from "react";
import { TaskContext } from "./taskContextDef.ts";
import { TaskCore } from "./taskCore.ts";
import toast from "react-hot-toast";

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const coreRef = useRef<TaskCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new TaskCore(undefined, {
      onStateChange: forceUpdate,
      onToastSuccess: (msg) => toast.success(msg),
      onToastError: (msg) => toast.error(msg),
      onToastInfo: (msg) => toast(msg),
      onToastUndo: (task, onUndo) => {
        toast(
          (t) => (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate max-w-[200px]">Deleted "{task.title}"</span>
              <button
                onClick={() => {
                  onUndo();
                  toast.dismiss(t.id);
                }}
                className="px-2 py-1 font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
              >
                Undo
              </button>
            </div>
          ),
          { duration: 5000 }
        );
      },
      onConfirm: (msg) => window.confirm(msg),
    });
  }

  const core = coreRef.current;

  // Listen for storage events from other tabs (including external clear where key === null) (T07)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      core.handleStorageEvent(e.key);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [core]);

  return (
    <TaskContext.Provider
      value={{
        tasks: core.tasks,
        addTask: core.addTask,
        updateTask: core.updateTask,
        deleteTask: (id) => {
          core.deleteTask(id);
        },
        undoDelete: () => {},
        getTask: core.getTask,
        toggleTaskCompletion: (id) => {
          core.toggleTaskCompletion(id);
        },
        loadSampleTasks: () => {
          core.loadSampleTasks();
        },
        clearAllTasks: () => {
          core.clearAllTasks();
        },
        exportTasks: core.exportTasks,
        importTasks: core.importTasks,
        storageError: core.storageError,
        isCorrupted: core.isCorrupted,
        rawCorruptedString: core.rawCorruptedString,
        loadError: core.loadError,
        isInitialLoadFailed: core.isInitialLoadFailed,
        retryLoadStorage: core.retryLoadStorage,
        resetCorruptedStorage: () => {
          core.resetCorruptedStorage();
        },
        downloadRawCorruptedBackup: core.downloadRawCorruptedBackup,
        hasExternalTabUpdate: core.hasExternalTabUpdate,
        syncFromStorage: () => {
          core.syncFromStorage();
        },
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
