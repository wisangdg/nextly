import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTasks } from "../context/TaskContext";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { TaskStatus } from "../types/Task"; // Updated casing

interface QuickAddTaskProps {
  onClose: () => void;
  isOpen: boolean;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  onClose,
  isOpen,
}) => {
  const { addTask } = useTasks();
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    addTask({
      title: title.trim(),
      description: "",
      category: "other",
      priority: "medium",
      status: TaskStatus.Active,
    });

    toast.success("Task added successfully!");
    onClose();
  };

  return (
    <Dialog
      as={motion.div}
      open={isOpen}
      onClose={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
              Quick Add Task
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter task title..."
              aria-label="Task title"
              autoFocus
            />
            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn btn-primary">
                Add Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};
