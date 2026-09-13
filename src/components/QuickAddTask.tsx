import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useTasks } from "../context/useTasks.ts";
import { useModal } from "../context/useModal.ts";
import { TaskStatus } from "../types/Task.ts";

interface QuickAddTaskProps {
  onClose: () => void;
  isOpen: boolean;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  onClose,
  isOpen,
}) => {
  const { addTask } = useTasks();
  const { openTaskCreateModal } = useModal();
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const created = addTask({
      title: trimmed,
      description: "",
      category: "other",
      priority: "medium",
      status: TaskStatus.Active,
    });

    if (created) {
      setTitle("");
      onClose();
    }
  };

  const handleOpenDetailed = () => {
    onClose();
    openTaskCreateModal(title);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center flex items-center justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-secondary-900/60 backdrop-blur-xs transition-opacity" />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-secondary-800 shadow-2xl rounded-2xl border border-secondary-200 dark:border-secondary-700 relative z-10">
          <div className="flex justify-between items-center pb-3 border-b border-secondary-100 dark:border-secondary-700">
            <Dialog.Title className="text-lg font-bold text-secondary-900 dark:text-white">
              Quick Add Task
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <div>
              <label
                htmlFor="quick-task-title"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5"
              >
                Task Title
              </label>
              <input
                id="quick-task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:border-secondary-600 dark:text-white text-sm"
                placeholder="What needs to be done? Press Enter to save..."
                autoFocus
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenDetailed}
                className="inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 min-h-[44px] px-2"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                Add details (date, priority)...
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-3.5 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};
