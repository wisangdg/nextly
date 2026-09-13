import React from "react";
import { TaskStatus } from "../types/Task.ts";
import type { Task } from "../types/Task.ts";
import { useTasks } from "../context/useTasks.ts";
import {
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import { getDueDateDisplay } from "../utils/dateUtils.ts";
import { getSmartSortReason } from "../utils/taskSorting.ts";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  showSmartReason?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onEdit,
  showSmartReason = true,
}) => {
  const { toggleTaskCompletion, deleteTask } = useTasks();

  const handleDelete = () => {
    deleteTask(task.id);
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border border-red-200 dark:border-red-800";
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-200 dark:border-green-800";
      default:
        return "bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200";
    }
  };

  const shouldReduceMotion = useReducedMotion();
  const dueDateInfo = getDueDateDisplay(task.dueDate);
  const smartReason = showSmartReason ? getSmartSortReason(task) : null;
  const isCompleted = task.status === TaskStatus.Completed;

  return (
    <motion.div
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
      className={`group bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200/80 dark:border-secondary-700/80 shadow-sm hover:shadow-md transition-all duration-200 ${
        isCompleted ? "opacity-70 bg-secondary-50/50 dark:bg-secondary-900/30" : ""
      }`}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <label
              htmlFor={`task-check-${task.id}`}
              className="pt-0.5 -mt-2 -ml-1 flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
            >
              <input
                id={`task-check-${task.id}`}
                type="checkbox"
                checked={isCompleted}
                onChange={() => toggleTaskCompletion(task.id)}
                aria-label={`Mark task as ${isCompleted ? "incomplete" : "complete"}: ${task.title}`}
                className="h-5 w-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer transition-colors"
              />
            </label>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <label
                  htmlFor={`task-check-${task.id}`}
                  className={`text-sm sm:text-base font-semibold block cursor-pointer break-words ${
                    isCompleted
                      ? "line-through text-secondary-500 dark:text-secondary-400"
                      : "text-secondary-900 dark:text-white"
                  }`}
                >
                  {task.title}
                </label>
              </div>

              {task.description && (
                <p className="mt-0.5 text-xs sm:text-sm text-secondary-600 dark:text-secondary-300 line-clamp-2 break-words">
                  {task.description}
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2 items-center text-xs">
                {/* Priority Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>

                {/* Category Badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200">
                  {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                </span>

                {/* Due Date with Calendar Accuracy */}
                {dueDateInfo && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dueDateInfo.className}`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    {dueDateInfo.label}
                  </span>
                )}

                {/* Smart Sort Reason */}
                {smartReason && !isCompleted && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 border border-primary-100 dark:border-primary-900/50"
                    title="Transparent rule: why this task is prioritized here"
                  >
                    <SparklesIcon className="h-3 w-3 mr-1 text-primary-500" aria-hidden="true" />
                    {smartReason}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons (Touch Target >= 44px) */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => onEdit(task)}
              aria-label={`Edit task: ${task.title}`}
              className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-secondary-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-secondary-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <PencilIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={handleDelete}
              aria-label={`Delete task: ${task.title}`}
              className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-secondary-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <TrashIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
