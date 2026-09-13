import React from "react";
import { useTasks } from "../context/useTasks.ts";
import { useModal } from "../context/useModal.ts";
import { TaskStatus } from "../types/Task.ts";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  SparklesIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { getDueDateUrgency } from "../utils/dateUtils.ts";
import { useLocalDate } from "../utils/useLocalDate.ts";
import { sortTasks } from "../utils/taskSorting.ts";
import { TaskItem } from "./TaskItem.tsx";
import { SavedView } from "./TaskList.tsx";

interface DashboardProps {
  onNavigateToTasks?: (preset?: { view?: SavedView }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTasks }) => {
  const { tasks, loadSampleTasks } = useTasks();
  const { openTaskCreateModal, openTaskEditModal } = useModal();

  // R09 fix: dynamic local date updating on focus/visibility/midnight
  const todayStr = useLocalDate();

  // Actionable metrics
  const activeTasks = tasks.filter((t) => t.status === TaskStatus.Active);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.Completed);

  const overdueTasks = activeTasks.filter(
    (t) => getDueDateUrgency(t.dueDate, todayStr) === "overdue"
  );
  const dueTodayTasks = activeTasks.filter(
    (t) => getDueDateUrgency(t.dueDate, todayStr) === "today"
  );
  const highPriorityActiveTasks = activeTasks.filter((t) => t.priority === "high");

  const totalCount = tasks.length;
  const completedCount = completedTasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Next Up: Top 3 actionable tasks by Smart Sort
  const nextUpTasks = sortTasks(activeTasks, "smart", todayStr).slice(0, 3);

  // Priority distribution of active tasks
  const lowCount = activeTasks.filter((t) => t.priority === "low").length;
  const medCount = activeTasks.filter((t) => t.priority === "medium").length;
  const highCount = highPriorityActiveTasks.length;
  const maxPriorityCount = Math.max(lowCount, medCount, highCount, 1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Welcome & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-secondary-200 dark:border-secondary-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
            Transparent, rule-based focus for your next actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center text-xs sm:text-sm font-medium text-secondary-600 dark:text-secondary-300 bg-white dark:bg-secondary-800 px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-2xs">
            <CalendarIcon className="h-4 w-4 mr-1.5 text-primary-500" aria-hidden="true" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <button
            onClick={() => openTaskCreateModal()}
            className="inline-flex items-center min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusIcon className="h-4 w-4 mr-1" aria-hidden="true" />
            Add Task
          </button>
        </div>
      </div>

      {/* Actionable Stat Cards (R07 fix: exact match with TaskList saved views) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overdue Card */}
        <button
          type="button"
          onClick={() => onNavigateToTasks?.({ view: "overdue" })}
          className="p-5 rounded-2xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs hover:shadow-md hover:border-red-300 dark:hover:border-red-800 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Overdue
            </span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform motion-reduce:transform-none motion-reduce:transition-none">
              <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-secondary-900 dark:text-white">
            {overdueTasks.length}
          </p>
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
            {overdueTasks.length === 0 ? "Great job, no overdue tasks!" : "Requires immediate attention"}
          </p>
        </button>

        {/* Due Today Card */}
        <button
          type="button"
          onClick={() => onNavigateToTasks?.({ view: "today" })}
          className="p-5 rounded-2xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Due Today
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform motion-reduce:transform-none motion-reduce:transition-none">
              <ClockIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-secondary-900 dark:text-white">
            {dueTodayTasks.length}
          </p>
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
            Target to complete before end of day
          </p>
        </button>

        {/* Active Tasks Card */}
        <button
          type="button"
          onClick={() => onNavigateToTasks?.({ view: "active" })}
          className="p-5 rounded-2xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs hover:shadow-md hover:border-primary-300 dark:hover:border-primary-800 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
              Active Tasks
            </span>
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:scale-105 transition-transform motion-reduce:transform-none motion-reduce:transition-none">
              <SparklesIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-secondary-900 dark:text-white">
            {activeTasks.length}
          </p>
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
            {highCount} high priority waiting
          </p>
        </button>

        {/* Completed Tasks Card */}
        <button
          type="button"
          onClick={() => onNavigateToTasks?.({ view: "completed" })}
          className="p-5 rounded-2xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs hover:shadow-md hover:border-green-300 dark:hover:border-green-800 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-105 transition-transform motion-reduce:transform-none motion-reduce:transition-none">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-secondary-900 dark:text-white">
            {completedCount}
          </p>
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
            {completionRate}% of {totalCount} total tasks
          </p>
        </button>
      </div>

      {/* Next Up Focus Section (R01 fix: don't offer destructive sample if tasks already exist) */}
      <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary-500" aria-hidden="true" />
              <h2 className="text-lg font-bold text-secondary-900 dark:text-white">
                Next Up
              </h2>
            </div>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
              Prioritized by urgency, priority, and deadline using transparent smart sorting.
            </p>
          </div>
          {activeTasks.length > 3 && (
            <button
              onClick={() => onNavigateToTasks?.({ view: "active" })}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer min-h-[44px] flex items-center"
            >
              View all active ({activeTasks.length}) →
            </button>
          )}
        </div>

        {nextUpTasks.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-secondary-50 dark:bg-secondary-900/40 border border-dashed border-secondary-200 dark:border-secondary-700">
            <CheckCircleIcon className="h-10 w-10 text-green-500 mx-auto mb-2" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">
              {totalCount === 0 ? "Your workspace is empty" : "All active tasks are complete!"}
            </h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 max-w-sm mx-auto">
              {totalCount === 0
                ? "Add your first task or load the sample workspace to see Smart Sort in action."
                : "Great momentum! You can add a new task or review completed tasks."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => openTaskCreateModal()}
                className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs cursor-pointer"
              >
                Add Task
              </button>
              {/* Only offer sample when workspace is completely empty (R01 fix) */}
              {totalCount === 0 && (
                <button
                  onClick={loadSampleTasks}
                  className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-secondary-700 dark:text-secondary-200 bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 rounded-lg cursor-pointer"
                >
                  Load Sample Workspace
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {nextUpTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={openTaskEditModal}
                showSmartReason={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Analytics: Priority Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Priority Breakdown */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs p-5 sm:p-6">
          <h2 className="text-base font-bold text-secondary-900 dark:text-white mb-1">
            Active Tasks by Priority
          </h2>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-6">
            Distribution of incomplete work needing attention.
          </p>

          <div className="h-44 flex items-end justify-around gap-4 pb-2 border-b border-secondary-100 dark:border-secondary-700">
            {/* Low Priority Bar */}
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-xs font-bold text-secondary-700 dark:text-secondary-300 mb-1.5">
                {lowCount}
              </span>
              <div
                className="w-full max-w-[48px] bg-green-500 rounded-t-lg transition-all duration-500 motion-reduce:transition-none"
                style={{
                  height: lowCount > 0 ? `${Math.round((lowCount / maxPriorityCount) * 100)}%` : "0px",
                }}
              />
              <span className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-400">
                Low
              </span>
            </div>

            {/* Medium Priority Bar */}
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-xs font-bold text-secondary-700 dark:text-secondary-300 mb-1.5">
                {medCount}
              </span>
              <div
                className="w-full max-w-[48px] bg-amber-500 rounded-t-lg transition-all duration-500 motion-reduce:transition-none"
                style={{
                  height: medCount > 0 ? `${Math.round((medCount / maxPriorityCount) * 100)}%` : "0px",
                }}
              />
              <span className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-400">
                Medium
              </span>
            </div>

            {/* High Priority Bar */}
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-xs font-bold text-secondary-700 dark:text-secondary-300 mb-1.5">
                {highCount}
              </span>
              <div
                className="w-full max-w-[48px] bg-red-500 rounded-t-lg transition-all duration-500 motion-reduce:transition-none"
                style={{
                  height: highCount > 0 ? `${Math.round((highCount / maxPriorityCount) * 100)}%` : "0px",
                }}
              />
              <span className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-400">
                High
              </span>
            </div>
          </div>
        </div>

        {/* Progress & Completion Rate */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-secondary-900 dark:text-white mb-1">
              Overall Progress
            </h2>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-6">
              Ratio of completed tasks vs active tasks.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline text-sm">
                <span className="font-semibold text-secondary-700 dark:text-secondary-300">
                  Completion Rate
                </span>
                <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                  {completionRate}%
                </span>
              </div>

              <div className="w-full bg-secondary-100 dark:bg-secondary-700 rounded-full h-3.5 overflow-hidden">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <div className="pt-2 flex justify-between text-xs text-secondary-500 dark:text-secondary-400">
                <span>{completedCount} completed</span>
                <span>{activeTasks.length} active</span>
                <span>{totalCount} total</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-secondary-100 dark:border-secondary-700/60 text-xs text-secondary-500 dark:text-secondary-400">
            {totalCount === 0 ? (
              <span>No tasks in workspace. Click "Add Task" to start.</span>
            ) : completionRate === 100 ? (
              <span className="text-green-600 dark:text-green-400 font-medium">All tasks completed! Excellent momentum.</span>
            ) : (
              <span>Focus on your top Next Up task to maintain steady progress.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
