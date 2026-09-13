import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTasks } from "../context/useTasks.ts";
import { useModal } from "../context/useModal.ts";
import { TaskStatus } from "../types/Task.ts";
import type { Category, Priority } from "../types/Task.ts";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "../utils/storage.ts";

const categories: Category[] = [
  "work",
  "personal",
  "shopping",
  "health",
  "other",
];

const priorities: Priority[] = ["low", "medium", "high"];

export const TaskEditModal: React.FC = () => {
  const { addTask, updateTask } = useTasks();
  const { isTaskModalOpen, modalMode, taskToEdit, initialTitle, closeTaskModal } = useModal();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other" as Category,
    priority: "medium" as Priority,
    dueDate: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (modalMode === "edit" && taskToEdit) {
      setFormData({
        title: taskToEdit.title,
        description: taskToEdit.description || "",
        category: taskToEdit.category,
        priority: taskToEdit.priority,
        dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.split("T")[0] : "",
      });
      setValidationError(null);
    } else if (modalMode === "create") {
      setFormData({
        title: initialTitle || "",
        description: "",
        category: "other",
        priority: "medium",
        dueDate: "",
      });
      setValidationError(null);
    }
  }, [modalMode, taskToEdit, initialTitle, isTaskModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formData.title.trim();

    if (!trimmedTitle) {
      setValidationError("Task title is required.");
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setValidationError(`Title must be under ${MAX_TITLE_LENGTH} characters.`);
      return;
    }

    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      setValidationError(`Description must be under ${MAX_DESCRIPTION_LENGTH} characters.`);
      return;
    }

    if (modalMode === "edit" && taskToEdit) {
      const success = updateTask(taskToEdit.id, {
        title: trimmedTitle,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        dueDate: formData.dueDate.trim() ? formData.dueDate : null,
      });
      if (success) {
        closeTaskModal();
      }
    } else {
      const created = addTask({
        title: trimmedTitle,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: TaskStatus.Active,
        dueDate: formData.dueDate || undefined,
      });
      if (created) {
        closeTaskModal();
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "title" && value.trim()) {
      setValidationError(null);
    }
  };

  if (!isTaskModalOpen) return null;

  const isEdit = modalMode === "edit";

  return (
    <Dialog
      open={isTaskModalOpen}
      onClose={closeTaskModal}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center flex items-center justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-secondary-900/60 backdrop-blur-xs transition-opacity" />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-secondary-800 shadow-2xl rounded-2xl border border-secondary-200 dark:border-secondary-700 relative z-10">
          <div className="flex justify-between items-center pb-4 border-b border-secondary-100 dark:border-secondary-700/60">
            <Dialog.Title className="text-xl font-bold text-secondary-900 dark:text-white">
              {isEdit ? "Edit Task" : "Create New Task"}
            </Dialog.Title>
            <button
              type="button"
              onClick={closeTaskModal}
              aria-label="Close dialog"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {validationError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {validationError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="modal-task-title"
                className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-1"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="modal-task-title"
                name="title"
                required
                maxLength={MAX_TITLE_LENGTH}
                value={formData.title}
                onChange={handleChange}
                className="block w-full px-3.5 py-2.5 rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white sm:text-sm"
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="modal-task-description"
                className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="modal-task-description"
                name="description"
                rows={3}
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={formData.description}
                onChange={handleChange}
                className="block w-full px-3.5 py-2.5 rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white sm:text-sm"
                placeholder="Add optional notes, steps, or acceptance criteria..."
              />
            </div>

            {/* Category & Priority & Due Date in a grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="modal-task-category"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
                >
                  Category
                </label>
                <select
                  id="modal-task-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white sm:text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="modal-task-priority"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
                >
                  Priority
                </label>
                <select
                  id="modal-task-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white sm:text-sm"
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="modal-task-duedate"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
                >
                  Due Date
                </label>
                <input
                  type="date"
                  id="modal-task-duedate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 pt-4 border-t border-secondary-100 dark:border-secondary-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeTaskModal}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-200 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors cursor-pointer"
              >
                {isEdit ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};
