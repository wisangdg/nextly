import React, { useState, useMemo } from "react";
import { useTasks } from "../context/useTasks.ts";
import { useModal } from "../context/useModal.ts";
import { TaskStatus } from "../types/Task.ts";
import type { Task } from "../types/Task.ts";
import { TaskItem } from "./TaskItem.tsx";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ClipboardDocumentListIcon,
  SparklesIcon,
  FunnelIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { sortTasks, SortOption } from "../utils/taskSorting.ts";
import { getDueDateUrgency } from "../utils/dateUtils.ts";
import { useLocalDate } from "../utils/useLocalDate.ts";

export type SavedView = "all" | "active" | "today" | "upcoming" | "overdue" | "completed";

interface TaskListProps {
  initialView?: SavedView;
}

export const TaskList: React.FC<TaskListProps> = ({ initialView = "all" }) => {
  const { tasks, loadSampleTasks } = useTasks();
  const { openTaskEditModal, openTaskCreateModal } = useModal();

  const [activeView, setActiveView] = useState<SavedView>(initialView);
  const [filter, setFilter] = useState({
    category: "all",
    priority: "all",
    search: "",
    sortBy: "smart" as SortOption,
  });

  // R09 fix: dynamic local date updating on focus/visibility/midnight
  const todayStr = useLocalDate();
  const shouldReduceMotion = useReducedMotion();

  const handleResetFilters = () => {
    setActiveView("all");
    setFilter({
      category: "all",
      priority: "all",
      search: "",
      sortBy: "smart",
    });
  };

  // Filter tasks according to active saved view and filter criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Saved View constraint (R07 fix: active view included)
      switch (activeView) {
        case "active":
          if (task.status !== TaskStatus.Active) return false;
          break;
        case "today":
          if (task.status !== TaskStatus.Active) return false;
          if (getDueDateUrgency(task.dueDate, todayStr) !== "today") return false;
          break;
        case "upcoming":
          if (task.status !== TaskStatus.Active) return false;
          if (
            getDueDateUrgency(task.dueDate, todayStr) !== "upcoming" &&
            getDueDateUrgency(task.dueDate, todayStr) !== "tomorrow"
          )
            return false;
          break;
        case "overdue":
          if (task.status !== TaskStatus.Active) return false;
          if (getDueDateUrgency(task.dueDate, todayStr) !== "overdue") return false;
          break;
        case "completed":
          if (task.status !== TaskStatus.Completed) return false;
          break;
        case "all":
        default:
          break;
      }

      // 2. Category
      if (filter.category !== "all" && task.category !== filter.category) {
        return false;
      }

      // 3. Priority
      if (filter.priority !== "all" && task.priority !== filter.priority) {
        return false;
      }

      // 4. Search
      if (filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [tasks, activeView, filter, todayStr]);

  // Sort tasks safely without mutation
  const sortedTasks = useMemo(() => {
    return sortTasks(filteredTasks, filter.sortBy, todayStr);
  }, [filteredTasks, filter.sortBy, todayStr]);

  const hasActiveFilters =
    activeView !== "all" ||
    filter.category !== "all" ||
    filter.priority !== "all" ||
    filter.search.trim() !== "" ||
    filter.sortBy !== "smart";

  const handleEditTask = (task: Task) => {
    openTaskEditModal(task);
  };

  const savedTabs: { id: SavedView; label: string }[] = [
    { id: "all", label: "All Tasks" },
    { id: "active", label: "Active" },
    { id: "today", label: "Due Today" },
    { id: "upcoming", label: "Upcoming" },
    { id: "overdue", label: "Overdue" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-secondary-200 dark:border-secondary-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 dark:text-white tracking-tight">
            Tasks
          </h1>
          <p className="text-xs sm:text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
            {sortedTasks.length} task{sortedTasks.length === 1 ? "" : "s"} shown
          </p>
        </div>

        <button
          onClick={() => openTaskCreateModal()}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Add Task
        </button>
      </div>

      {/* Saved View Filters (S08 & R10 fix: accessible navigation with aria-pressed and 44px min-height) */}
      <nav
        aria-label="Filter tasks by view"
        className="flex flex-wrap items-center gap-2 border-b border-secondary-200 dark:border-secondary-800 pb-3"
      >
        {savedTabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveView(tab.id)}
              className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                isActive
                  ? "bg-primary-600 text-white shadow-xs"
                  : "text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-secondary-800 p-4 rounded-2xl border border-secondary-200/80 dark:border-secondary-700/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Category Filter */}
          <div>
            <label
              htmlFor="filter-category"
              className="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Category
            </label>
            <select
              id="filter-category"
              value={filter.category}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, category: e.target.value }))
              }
              className="block w-full min-h-[44px] text-xs sm:text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-2xs focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-700 dark:text-secondary-100 py-2 px-3"
            >
              <option value="all">All Categories</option>
              {["work", "personal", "shopping", "health", "other"].map(
                (category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label
              htmlFor="filter-priority"
              className="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Priority
            </label>
            <select
              id="filter-priority"
              value={filter.priority}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="block w-full min-h-[44px] text-xs sm:text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-2xs focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-700 dark:text-secondary-100 py-2 px-3"
            >
              <option value="all">All Priorities</option>
              {["high", "medium", "low"].map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Mode */}
          <div>
            <label
              htmlFor="filter-sortby"
              className="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1 flex items-center justify-between"
            >
              <span>Sort By</span>
              {filter.sortBy === "smart" && (
                <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400 flex items-center">
                  <SparklesIcon className="h-3 w-3 mr-0.5" /> Recommended
                </span>
              )}
            </label>
            <select
              id="filter-sortby"
              value={filter.sortBy}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  sortBy: e.target.value as SortOption,
                }))
              }
              className="block w-full min-h-[44px] text-xs sm:text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-2xs focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-700 dark:text-secondary-100 py-2 px-3 font-medium"
            >
              <option value="smart">Smart Sort (Urgency + Priority)</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="newest">Newest Created</option>
            </select>
          </div>

          {/* Search Field */}
          <div>
            <label
              htmlFor="filter-search"
              className="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Search
            </label>
            <input
              type="text"
              id="filter-search"
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="block w-full min-h-[44px] text-xs sm:text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 shadow-2xs focus:border-primary-500 focus:ring-primary-500 dark:bg-secondary-700 dark:text-secondary-100 py-2 px-3"
              placeholder="Search title or details..."
            />
          </div>
        </div>

        {/* Reset Active Filters Bar */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700/60 flex items-center justify-between text-xs">
            <span className="text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
              <FunnelIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Active filters applied
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Task List Items / Empty States */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          tasks.length === 0 ? (
            /* Empty State 1: No tasks in workspace */
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 border-dashed text-center">
              <div className="p-4 rounded-full bg-primary-50 dark:bg-primary-950/50 mb-4">
                <ClipboardDocumentListIcon className="h-10 w-10 text-primary-500" aria-hidden="true" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-secondary-900 dark:text-white">
                Your workspace is empty
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-secondary-500 dark:text-secondary-400 max-w-sm">
                Start organizing your day by creating your first task or loading the sample workspace.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => openTaskCreateModal()}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Create First Task
                </button>
                <button
                  onClick={loadSampleTasks}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold text-secondary-700 dark:text-secondary-200 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-xl transition-colors cursor-pointer"
                >
                  Load Sample Workspace
                </button>
              </div>
            </div>
          ) : (
            /* Empty State 2: Active filter produced 0 results */
            <div className="flex flex-col items-center justify-center py-14 px-4 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 border-dashed text-center">
              <FunnelIcon className="h-10 w-10 text-secondary-400 mb-3" aria-hidden="true" />
              <h3 className="text-base sm:text-lg font-bold text-secondary-900 dark:text-white">
                No matching tasks found
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-secondary-500 dark:text-secondary-400 max-w-sm">
                None of your tasks match the current search or filter combination.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 rounded-xl border border-primary-200 dark:border-primary-800 transition-colors cursor-pointer flex items-center justify-center"
              >
                Reset Filters
              </button>
            </div>
          )
        ) : (
          <AnimatePresence mode={shouldReduceMotion ? "sync" : "popLayout"}>
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                showSmartReason={filter.sortBy === "smart"}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
