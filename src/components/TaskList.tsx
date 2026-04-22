import React, { useState } from "react";
import { useTaskContext } from "../context/TaskContext";
import { Task, TaskStatus } from "../types/Task"; // Updated casing
import { TaskItem } from "./TaskItem";
import { useModal } from "../context/ModalContext";
import { AnimatePresence } from "framer-motion";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export const TaskList: React.FC = () => {
  const { tasks } = useTaskContext();
  const { openTaskEditModal } = useModal();
  const [filter, setFilter] = useState({
    status: "all",
    category: "all",
    priority: "all",
    search: "",
    sortBy: "smart",
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filter.status === "all" ||
      (filter.status === "completed" && task.status === TaskStatus.Completed) ||
      (filter.status === "active" && task.status === TaskStatus.Active);

    const matchesCategory =
      filter.category === "all" || task.category === filter.category;

    const matchesPriority =
      filter.priority === "all" || task.priority === filter.priority;

    const matchesSearch =
      filter.search === "" ||
      task.title.toLowerCase().includes(filter.search.toLowerCase()) ||
      task.description.toLowerCase().includes(filter.search.toLowerCase());

    return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed tasks always go to the bottom
    if (a.status !== b.status) {
      return a.status === TaskStatus.Active ? -1 : 1;
    }

    switch (filter.sortBy) {
      case "dueDate":
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      
      case "priority": {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }

      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      case "smart":
      default: {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    }
  });

  const handleEditTask = (task: Task) => {
    openTaskEditModal(task);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label
              htmlFor="status"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status
            </label>
            <select
              id="status"
              value={filter.status}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, status: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Category
            </label>
            <select
              id="category"
              value={filter.category}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, category: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all">All</option>
              {["work", "personal", "shopping", "health", "other"].map(
                (category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Priority
            </label>
            <select
              id="priority"
              value={filter.priority}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all">All</option>
              {["low", "medium", "high"].map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Sort By
            </label>
            <select
              id="sortBy"
              value={filter.sortBy}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, sortBy: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="smart">Smart Sort</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label
              htmlFor="search"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Search
            </label>
            <input
              type="text"
              id="search"
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="Search tasks..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 border-dashed">
            <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
              You don't have any tasks matching the current filters. Try adjusting your search or add a new task!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onEdit={handleEditTask} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
