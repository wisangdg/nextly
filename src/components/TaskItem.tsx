import React from "react";
import { Task, TaskStatus } from "../types/Task";
import { useTaskContext } from "../context/TaskContext";
import {
  TrashIcon,
  PencilIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit }) => {
  const { toggleTaskCompletion, deleteTask } = useTaskContext();

  const handleDelete = () => {
    deleteTask(task.id);
    toast.success("Task deleted successfully!");
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-secondary-800 rounded-lg shadow-task hover:shadow-task-hover transition-all duration-300 ${
        task.status === TaskStatus.Completed ? "opacity-75" : ""
      }`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
            <input
              id={`task-${task.id}`}
              type="checkbox"
              checked={task.status === TaskStatus.Completed}
              onChange={() => toggleTaskCompletion(task.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`task-${task.id}`}
                className={`text-sm sm:text-base font-medium truncate block cursor-pointer ${
                  task.status === TaskStatus.Completed
                    ? "line-through text-gray-500 dark:text-gray-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {task.title}
              </label>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {task.description}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2 items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary-100 dark:bg-secondary-700 text-secondary-800 dark:text-secondary-100">
                  {task.category.charAt(0).toUpperCase() +
                    task.category.slice(1)}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority.charAt(0).toUpperCase() +
                    task.priority.slice(1)}
                </span>
                {task.dueDate && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100">
                    <CalendarIcon className="h-3 w-3 mr-1" />{" "}
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-1 sm:space-x-2 ml-2 sm:ml-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEdit(task)}
              aria-label="Edit task"
              className="p-2 text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-full hover:bg-primary-50 dark:hover:bg-secondary-700 transition-colors"
            >
              <PencilIcon className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              aria-label="Delete task"
              className="p-2 text-secondary-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
